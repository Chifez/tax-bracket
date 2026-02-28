import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker, createScheduler } from 'tesseract.js';
import { pdf as pdfToImg } from 'pdf-to-img';
import { ParsedFileResult, ParsedRow, TextItem } from './types';
import { bucketIntoRows, mergeAdjacentItems, coerceRowTypes } from './utils';
import { detectHeadersWithLLM, buildColumnDefs } from './llm';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

async function buildStructuredRows(allTextItems: TextItem[]): Promise<{
    structuredRows: ParsedRow[]
    headers: string[]
}> {
    const rawRows = bucketIntoRows(allTextItems);
    const mergedRows = rawRows.map(row => mergeAdjacentItems(row));

    let llmResult: { headerRowIndex: number; columns: { originalName: string; standardizedName: string }[] };
    try {
        llmResult = await detectHeadersWithLLM(mergedRows);
    } catch (e: any) {
        console.error('[LLM] Header detection failed:', e.message);
        return { structuredRows: [], headers: [] };
    }

    if (llmResult.headerRowIndex === -1 || llmResult.columns.length === 0) {
        console.warn('[LLM] No table headers detected.');
        return { structuredRows: [], headers: [] };
    }

    console.log(
        `[LLM] Headers at Row ${llmResult.headerRowIndex}:`,
        llmResult.columns.map(c => c.standardizedName).join(', ')
    );

    const headerRowItems = mergedRows[llmResult.headerRowIndex];
    if (!headerRowItems || headerRowItems.length === 0) {
        return { structuredRows: [], headers: [] };
    }

    const columns = buildColumnDefs(headerRowItems, llmResult.columns);
    const headers = columns.map(c => c.standardizedName);
    const structuredRows: ParsedRow[] = [];

    for (let i = llmResult.headerRowIndex + 1; i < mergedRows.length; i++) {
        const rowItems = mergedRows[i];
        if (rowItems.length === 0) continue;

        const rowObj: ParsedRow = {};

        for (const item of rowItems) {
            // Use horizontal center point for column assignment.
            const itemCenterX = item.x + item.width / 2;
            const col = columns.find(c => itemCenterX >= c.startX && itemCenterX < c.endX);

            if (col) {
                // If it's a known multi-word duplicate column (like narration_1, narration_2), 
                // we'll later flatten it in the normalizer. For now, store exactly where it landed.
                rowObj[col.standardizedName] = rowObj[col.standardizedName]
                    ? `${rowObj[col.standardizedName]} ${item.text}`
                    : item.text;
            }
        }

        if (Object.keys(rowObj).length === 0) continue;

        structuredRows.push(coerceRowTypes(rowObj));
    }

    return { structuredRows, headers };
}

// -------------------------------------------------------------------
// PDF Parsing (Tiered)
// -------------------------------------------------------------------

export async function parsePdf(buffer: Buffer): Promise<ParsedFileResult> {
    try {
        // -----------------------------------------------------------
        // TIER 1: pdfjs-dist parallel text extraction
        // -----------------------------------------------------------
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        console.log(`[Tier 1] Extracting text from ${pdf.numPages} pages in parallel...`);

        const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
            const page = await pdf.getPage(i + 1);
            const textContent = await page.getTextContent();
            // Virtual page offset so lines from different pages don't overlap in Y
            const pageOffsetY = i * 10000;
            return textContent.items.map((item: any) => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5] - pageOffsetY,
                height: item.height,
                width: item.width,
            } as TextItem));
        });

        const perPageItems = await Promise.all(pagePromises);
        const allTextItems: TextItem[] = perPageItems.flat();
        let rawText = allTextItems.map(i => i.text).join(' ');

        console.log(`[Tier 1] Extracted ${rawText.trim().length} chars across ${pdf.numPages} pages.`);

        // -----------------------------------------------------------
        // TIER 2: pdf-to-img + Tesseract OCR (parallel via Scheduler)
        // -----------------------------------------------------------
        if (rawText.trim().length < 50) {
            console.log(`[Tier 2] Tier 1 yielded < 50 chars — starting OCR fallback...`);
            rawText = '';
            allTextItems.length = 0;

            const pageNumImages: { pageNum: number; buffer: Buffer }[] = [];
            let pageIdx = 1;
            for await (const pageImageBuffer of await pdfToImg(buffer, { scale: 2 })) {
                pageNumImages.push({ pageNum: pageIdx++, buffer: pageImageBuffer as Buffer });
            }

            console.log(`[Tier 2] Rendered ${pageNumImages.length} pages. Starting parallel OCR...`);

            const workerCount = Math.min(pageNumImages.length, 3);
            const scheduler = createScheduler();
            for (let i = 0; i < workerCount; i++) {
                const worker = await createWorker('eng');
                scheduler.addWorker(worker);
            }
            console.log(`[Tier 2] Scheduler initialised with ${workerCount} worker(s).`);

            try {
                const results = await Promise.all(
                    pageNumImages.map(img =>
                        scheduler.addJob('recognize', img.buffer, undefined, { blocks: true }).then(res => ({
                            pageNum: img.pageNum,
                            result: res,
                        }))
                    )
                );

                results.sort((a, b) => a.pageNum - b.pageNum);

                for (const { pageNum, result } of results) {
                    const { data } = result;
                    rawText += data.text + '\n';

                    const words = data.blocks?.flatMap((b: any) =>
                        b.paragraphs?.flatMap((p: any) =>
                            p.lines?.flatMap((l: any) =>
                                l.words?.map((w: any) => ({
                                    ...w,
                                    __lineY: l.bbox.y0
                                })) || []
                            ) || []
                        ) || []
                    ) || [];

                    if (words.length > 0) {
                        const pageOffsetY = pageNum * 10000;
                        const items: TextItem[] = words.map((w: any) => {
                            const width = Math.abs(w.bbox.x1 - w.bbox.x0);
                            const height = Math.abs(w.bbox.y1 - w.bbox.y0);
                            return {
                                text: w.text,
                                x: w.bbox.x0,
                                y: -w.bbox.y0 - pageOffsetY,
                                width: isNaN(width) ? 12 : width,
                                height: isNaN(height) || height === 0 ? 12 : height,
                                lineY: w.__lineY !== undefined ? -w.__lineY - pageOffsetY : undefined,
                            };
                        });
                        allTextItems.push(...items);
                    }
                }
            } finally {
                await scheduler.terminate();
                console.log('[Tier 2] Scheduler terminated, memory freed.');
            }
        }

        if (rawText.trim().length < 50) {
            console.warn('[Tier 3] OCR yielded < 50 chars. Python microservice fallback not yet implemented.');
            return { rawText, rows: [], format: 'pdf', headers: [] };
        }

        if (allTextItems.length === 0) {
            return { rawText, rows: [], format: 'pdf', headers: [] };
        }

        const { structuredRows, headers } = await buildStructuredRows(allTextItems);
        return { rawText, rows: structuredRows, format: 'pdf', headers };

    } catch (error: any) {
        throw new Error(`PDF Parsing failed: ${error.message}`);
    }
}
