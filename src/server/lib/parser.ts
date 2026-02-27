import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker, createScheduler } from 'tesseract.js';
import { pdf as pdfToImg } from 'pdf-to-img';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface ParsedRow {
    [key: string]: string | number | null | undefined
}

export interface ParsedFileResult {
    rawText: string
    rows: ParsedRow[]
    format: 'pdf' | 'csv' | 'xls' | 'xlsx' | 'text'
    headers: string[]
}

interface TextItem {
    text: string
    x: number
    y: number
    width: number
    height: number
    lineY?: number // Optional: Tesseract's native line bounding box Y
}

interface ColumnDef {
    originalName: string
    standardizedName: string
    startX: number
    endX: number
}

// -------------------------------------------------------------------
// Type Coercion
// Converts raw strings into proper numbers and ISO date strings.
// Runs on every row after column assignment so downstream consumers
// get typed data instead of everything as strings.
// -------------------------------------------------------------------

function coerceRowTypes(row: ParsedRow): ParsedRow {
    const result: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
        if (typeof value !== 'string') {
            result[key] = value;
            continue;
        }

        const cleaned = value.replace(/,/g, '').trim();

        // Currency / number: strip commas then check for pure numeric
        if (/^-?[\d.]+$/.test(cleaned) && cleaned.length > 0) {
            result[key] = parseFloat(cleaned);
            continue;
        }

        // Date formats: DD/MM/YYYY or DD-MM-YYYY
        if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(value)) {
            const [day, month, year] = value.split(/[\/\-]/);
            const parsed = new Date(`${year}-${month}-${day}`);
            result[key] = isNaN(parsed.getTime()) ? value : parsed.toISOString();
            continue;
        }

        // Date format: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const parsed = new Date(value);
            result[key] = isNaN(parsed.getTime()) ? value : parsed.toISOString();
            continue;
        }

        result[key] = value;
    }
    return result;
}

// -------------------------------------------------------------------
// Spatial Helpers
// -------------------------------------------------------------------

/**
 * bucketIntoRows — Skew-tolerant 1D Y-axis clustering
 *
 * WHY THE OLD VERSION BROKE:
 * The previous implementation expanded a per-row bounding box [rowMinY, rowMaxY]
 * as each token was appended. On scanned documents with even a 1–2° tilt, words
 * on the same physical line have slightly different Y coordinates. The first token
 * on a line set the bounding box; if the second token's centerY fell just outside
 * the box + pad, it was treated as a new row. This cascaded into nearly every word
 * becoming its own 1-token "row", destroying the table structure before it ever
 * reached the LLM.
 *
 * HOW THIS VERSION FIXES IT — 1D Agglomerative Clustering:
 *
 * Instead of a sequential bounding-box sweep, we:
 *   1. Compute centerY for every token (y - height/2).
 *   2. Sort all tokens globally by centerY, highest first.
 *   3. Derive epsilon = 0.6 × median token height.
 *      - This is data-driven: if OCR reports 18px-tall characters, epsilon ≈ 11px.
 *      - Within a skewed line, words drift by 2–4px max → well within epsilon.
 *      - Between lines, the gap is typically 6–20px+ → above epsilon → new row.
 *   4. Walk sorted tokens. If |currentCenterY - rowMeanY| ≤ epsilon → same row.
 *      Otherwise → flush row, start new one.
 *   5. Track a running mean Y for the current row instead of a fixed anchor.
 *      This handles gradual skew drift across wide lines without error accumulation.
 *
 * Result: a slight physical tilt that shifts word Y-coords by 3–4px no longer
 * splits a 10-word row into 10 separate rows.
 */
function bucketIntoRows(allTextItems: TextItem[]): TextItem[][] {
    // Filter blanks up front — they contribute nothing but corrupt row boundaries
    const items = allTextItems.filter(item => item.text.trim());
    if (items.length === 0) return [];

    // ── Step 1: Compute centerY for each token ──────────────────────────────
    // Convention inherited from both Tier 1 and Tier 2:
    //   y      = top edge of the bounding box (Y increases upward)
    //   height = positive height of the bounding box
    // Therefore centerY = y - height / 2  (midpoint, below the top edge)
    const withCenter = items.map(item => ({
        item,
        centerY: item.y - Math.abs(item.height || 12) / 2,
    }));

    // ── Step 2: Global top-to-bottom sort ────────────────────────────────────
    // Higher Y value = higher on the page, so sort descending.
    withCenter.sort((a, b) => b.centerY - a.centerY);

    // ── Step 3: Derive epsilon from median token height ──────────────────────
    // We sample ALL token heights, not just the first few, so a document with
    // mixed font sizes (headers + body) still produces a sensible median.
    const heights = items
        .map(i => Math.abs(i.height || 12))
        .filter(h => h > 0)
        .sort((a, b) => a - b);

    const medianHeight = heights.length > 0
        ? heights[Math.floor(heights.length / 2)]
        : 12; // safe fallback for edge cases where height is always 0

    // 0.6× gives enough slack for skew-induced jitter (typically < 0.3× line height)
    // while keeping it tight enough to separate adjacent lines (typically 1–2× apart)
    const epsilon = medianHeight * 0.6;

    console.log(
        `[bucketIntoRows] tokens=${items.length} ` +
        `medianHeight=${medianHeight.toFixed(1)} epsilon=${epsilon.toFixed(1)}`
    );

    // ── Step 4: Agglomerative 1D clustering ─────────────────────────────────
    const rawRows: TextItem[][] = [];
    let currentRow: TextItem[] = [withCenter[0].item];
    console.log(`[DEBUG] Initial token: text="${withCenter[0].item.text}" y=${withCenter[0].item.y} height=${withCenter[0].item.height} centerY=${withCenter[0].centerY}`);
    let rowSumY = withCenter[0].centerY;   // numerator for running mean
    let rowCount = 1;                       // denominator for running mean

    for (let i = 1; i < withCenter.length; i++) {
        const { item, centerY } = withCenter[i];
        const rowMeanY = rowSumY / rowCount;
        const gap = Math.abs(rowMeanY - centerY);

        if (i < 20) {
            console.log(`[DEBUG] token "${item.text}" rowMeanY=${rowMeanY.toFixed(1)} centerY=${centerY.toFixed(1)} gap=${gap.toFixed(1)} epsilon=${epsilon.toFixed(1)}`);
        }

        if (gap <= epsilon) {
            // Same row: update running mean so gradual skew drift doesn't
            // push later tokens outside a fixed anchor point.
            currentRow.push(item);
            rowSumY += centerY;
            rowCount++;
        } else {
            // New row: flush and reset
            rawRows.push([...currentRow]);
            currentRow = [item];
            rowSumY = centerY;
            rowCount = 1;
        }
    }
    if (currentRow.length > 0) rawRows.push(currentRow);

    // ── Step 5: Restore left-to-right reading order within each row ─────────
    rawRows.forEach(row => row.sort((a, b) => a.x - b.x));

    console.log(`[bucketIntoRows] Clustered ${items.length} tokens → ${rawRows.length} rows`);
    return rawRows;
}

function mergeAdjacentItems(row: TextItem[], gapThreshold = 8): TextItem[] {
    // Items with a horizontal gap < gapThreshold pixels are part of the
    // same word/token and get concatenated into one TextItem.
    // Prevents "1" "," "5" "0" "0" being treated as separate column values
    // instead of a single "1,500".
    if (row.length === 0) return [];
    const merged: TextItem[] = [];
    let current = { ...row[0] };

    for (let j = 1; j < row.length; j++) {
        const next = row[j];
        const gap = next.x - (current.x + current.width);
        if (gap < gapThreshold) {
            current.text += ' ' + next.text;
            current.width = (next.x - current.x) + next.width;
        } else {
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);
    return merged.filter(m => m.text.trim());
}

// -------------------------------------------------------------------
// LLM Header Detection
//
// Why LLM instead of a hardcoded header map:
// Every bank names their columns differently —
//   GTBank:    "Trans. Date" | "Narration"   | "Debit"       | "Credit"   | "Balance"
//   Access:    "Date"        | "Description" | "Withdrawals" | "Deposits" | "Balance"
//   Zenith:    "Value Date"  | "Remarks"     | "DR"          | "CR"       | "Balance"
//   FirstBank: "Txn Date"    | "Particulars" | "Debit"       | "Credit"   | "Bal"
//
// A hardcoded map breaks on every new bank or column rename.
// The LLM identifies the header row by understanding context and maps
// arbitrary column names to a standard schema in one call.
// -------------------------------------------------------------------

const HeaderSchema = z.object({
    headerRowIndex: z.number().describe(
        'Index (0-based) of the row containing the table column headers. Return -1 if not found.'
    ),
    columns: z.array(z.object({
        originalName: z.string().describe('Exact column label as it appears in the document'),
        standardizedName: z.string().describe(
            'Lowercase normalised name. Use: date, value_date, narration, reference, debit, credit, balance. ' +
            'For unrecognised columns use a simple lowercase snake_case label.'
        ),
    })),
});

async function detectHeadersWithLLM(mergedRows: TextItem[][]): Promise<{
    headerRowIndex: number
    columns: { originalName: string; standardizedName: string }[]
}> {
    // Send the first 30 rows — headers are always near the top.
    // Keeping the preview small reduces token cost and latency.
    const preview = mergedRows
        .slice(0, 50)
        .map((row, idx) => `[Row ${idx}] ${row.map(i => i.text).join(' | ')}`)
        .join('\n');

    console.log('[LLM] Detecting table headers...');
    console.log('--- PREVIEW SENT TO LLM ---');
    console.log(preview);
    console.log('---------------------------');

    const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: HeaderSchema,
        prompt: [
            'You are parsing a bank statement. Below are the first rows extracted from the document.',
            'Each row shows text items separated by " | ".',
            '',
            preview,
            '',
            'Identify the row index that contains the TABLE COLUMN HEADERS.',
            'Skip letterhead, account name, account number, address, statement date range, and opening balance rows.',
            'The header row contains labels like: date, narration, description, debit, credit, balance, reference, amount, withdrawals, deposits, or their abbreviations.',
            'Map each header to a standardised name.',
        ].join('\n'),
    });

    return object;
}

// -------------------------------------------------------------------
// Column Boundary Builder
//
// After LLM identifies the header row, we compute startX/endX ranges
// for each column using midpoints between adjacent headers.
//
// Midpoint boundaries ensure there are no gaps between columns —
// every horizontal pixel belongs to exactly one column so no text
// item ever falls through the cracks (the bug in the old version where
// startX = block.x - 10 left a gap between adjacent columns).
// -------------------------------------------------------------------

function buildColumnDefs(
    headerRowItems: TextItem[],
    llmColumns: { originalName: string; standardizedName: string }[]
): ColumnDef[] {
    return headerRowItems.map((block, i) => {
        // Match by position index — LLM returns columns in left-to-right
        // order matching the physical order of headerRowItems after X-sort.
        // String-inclusion matching caused false matches e.g. "date" → "update".
        const standardizedName = llmColumns[i]?.standardizedName ?? block.text.toLowerCase().trim();

        const prevBlock = headerRowItems[i - 1];
        const nextBlock = headerRowItems[i + 1];

        // startX: midpoint between this column's left edge and previous column's right edge.
        // First column extends to -Infinity to catch items starting before the first header.
        const startX = i === 0
            ? -Infinity
            : (prevBlock.x + prevBlock.width + block.x) / 2;

        // endX: midpoint between this column's right edge and next column's left edge.
        // Last column extends to +Infinity to catch items past the last header.
        const endX = nextBlock
            ? (block.x + block.width + nextBlock.x) / 2
            : Infinity;

        return { originalName: block.text, standardizedName, startX, endX };
    });
}

// -------------------------------------------------------------------
// Main Structured Row Builder
// -------------------------------------------------------------------

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
            // Center-based is more robust than left-edge — right-aligned
            // numeric cells (amounts, balances) often start left of their
            // column's boundary but their center is clearly within it.
            const itemCenterX = item.x + item.width / 2;
            const col = columns.find(c => itemCenterX >= c.startX && itemCenterX < c.endX);

            if (col) {
                // Append if column already has a value — handles multi-word
                // narrations like "TRANSFER TO JOHN DOE FT/2025/001"
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
        //
        // For digitally-generated PDFs with an embedded text layer.
        // Reads text and X/Y coordinates directly — no image rendering.
        //
        // Pages are processed with Promise.all instead of sequentially.
        // getPage() and getTextContent() are independent per page so
        // firing all at once cuts total time ~proportionally to page count.
        // -----------------------------------------------------------
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            // No canvasFactory — Tier 1 does not render pages to images.
            // Including it triggers the "HTMLCanvasElement" crash in pdfjs.
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
        //
        // Triggers when Tier 1 yields < 50 chars — indicates a scanned
        // PDF with no embedded text layer.
        //
        // pdf-to-img renders pages to PNG buffers using its own canvas
        // implementation, avoiding the HTMLCanvasElement crash that
        // breaks pdfjs + node-canvas when rendering in Node.
        //
        // Tesseract Scheduler distributes pages across N workers.
        // Each worker holds its own copy of the language model in memory
        // (~20-40MB each), so workerCount is capped at min(pages, 3)
        // to avoid loading unnecessary instances for small documents.
        //
        // Results are re-sorted by page number after Promise.all because
        // scheduler jobs complete in arbitrary order.
        // -----------------------------------------------------------
        if (rawText.trim().length < 50) {
            console.log(`[Tier 2] Tier 1 yielded < 50 chars — starting OCR fallback...`);
            rawText = '';
            allTextItems.length = 0;

            // Collect all page image buffers first
            const pageNumImages: { pageNum: number; buffer: Buffer }[] = [];
            let pageIdx = 1;
            for await (const pageImageBuffer of await pdfToImg(buffer, { scale: 2 })) {
                pageNumImages.push({ pageNum: pageIdx++, buffer: pageImageBuffer as Buffer });
            }

            console.log(`[Tier 2] Rendered ${pageNumImages.length} pages. Starting parallel OCR...`);

            // Scale worker count to document size, capped at 3
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

                // Re-sort by page number — scheduler returns jobs in completion
                // order, not submission order, so we must restore document sequence.
                results.sort((a, b) => a.pageNum - b.pageNum);

                for (const { pageNum, result } of results) {
                    const { data } = result;
                    rawText += data.text + '\n';

                    // In Tesseract v6+, words are hidden inside the blocks hierarchy
                    // and only present if { blocks: true } is passed to output.
                    const words = data.blocks?.flatMap((b: any) =>
                        b.paragraphs?.flatMap((p: any) =>
                            p.lines?.flatMap((l: any) =>
                                l.words?.map((w: any) => ({
                                    ...w,
                                    __lineY: l.bbox.y0 // Attach Tesseract's native line grouping
                                })) || []
                            ) || []
                        ) || []
                    ) || [];

                    if (words.length > 0) {
                        // Tesseract Y: 0 = top of image (increases downward).
                        // Negate y to match pdfjs convention (0 = bottom, increases upward)
                        // Virtual page offset ensures pages stack vertically instead of overlapping
                        const pageOffsetY = pageNum * 10000;
                        const items: TextItem[] = words.map((w: any) => {
                            // w.bbox structure: { x0, y0, x1, y1 }
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
                // Always terminate — each worker holds the language model in memory.
                // Without this, a failed parse leaks memory for the life of the process.
                await scheduler.terminate();
                console.log('[Tier 2] Scheduler terminated, memory freed.');
            }
        }

        // -----------------------------------------------------------
        // TIER 3: Python microservice fallback (TODO)
        // For encrypted, corrupted, or unsupported-encoding PDFs that
        // neither pdfjs nor Tesseract can handle.
        // -----------------------------------------------------------
        if (rawText.trim().length < 50) {
            console.warn('[Tier 3] OCR yielded < 50 chars. Python microservice fallback not yet implemented.');
            // TODO: const result = await fetch('http://localhost:5001/parse', { method: 'POST', body: buffer })
            return { rawText, rows: [], format: 'pdf', headers: [] };
        }

        if (allTextItems.length === 0) {
            return { rawText, rows: [], format: 'pdf', headers: [] };
        }

        // -----------------------------------------------------------
        // STRUCTURED ROW BUILDING
        // Spatial bucketing → LLM header detection → column assignment
        // → type coercion. Runs on the output of whichever tier succeeded.
        // -----------------------------------------------------------
        const { structuredRows, headers } = await buildStructuredRows(allTextItems);
        return { rawText, rows: structuredRows, format: 'pdf', headers };

    } catch (error: any) {
        throw new Error(`PDF Parsing failed: ${error.message}`);
    }
}

// -------------------------------------------------------------------
// CSV Parsing
// -------------------------------------------------------------------

export async function parseCsv(buffer: Buffer): Promise<ParsedFileResult> {
    const records: ParsedRow[] = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
    });

    // Use the original buffer as rawText — not JSON.stringify(records),
    // which loses the original formatting and is not useful for audits.
    const rawText = buffer.toString('utf-8');
    const headers = records.length > 0
        ? Object.keys(records[0]).map(h => h.toLowerCase().trim())
        : [];

    const normalizedRows = records.map(row => {
        const normalized: ParsedRow = {};
        for (const [key, value] of Object.entries(row)) {
            normalized[key.toLowerCase().trim()] = value;
        }
        return normalized;
    });

    return { rawText, rows: normalizedRows, format: 'csv', headers };
}

// -------------------------------------------------------------------
// XLS/XLSX Parsing
// -------------------------------------------------------------------

export async function parseXlsx(buffer: Buffer): Promise<ParsedFileResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return { rawText: '', rows: [], format: 'xlsx', headers: [] };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (jsonData.length === 0) {
        return { rawText: '', rows: [], format: 'xlsx', headers: [] };
    }

    const rawHeaders = (jsonData[0] || []).map((h: any) =>
        String(h ?? '').toLowerCase().trim()
    );
    const headers = rawHeaders.filter(Boolean);

    const rows: ParsedRow[] = [];
    for (let i = 1; i < jsonData.length; i++) {
        const rowData = jsonData[i];
        if (!rowData || rowData.every((cell: any) => cell === null || cell === '')) continue;

        const row: ParsedRow = {};
        rawHeaders.forEach((h: string, idx: number) => {
            if (h) row[h] = rowData[idx] ?? null;
        });
        rows.push(row);
    }

    const rawText = XLSX.utils.sheet_to_csv(sheet);
    return { rawText, rows, format: 'xlsx', headers };
}

// -------------------------------------------------------------------
// Unified Parser
// -------------------------------------------------------------------

const XLSX_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
];

export async function parseFile(buffer: Buffer, mimeType: string): Promise<ParsedFileResult> {
    if (mimeType === 'application/pdf') return parsePdf(buffer);
    if (mimeType === 'text/csv') return parseCsv(buffer);
    if (XLSX_MIME_TYPES.includes(mimeType)) return parseXlsx(buffer);
    if (mimeType.startsWith('text/')) {
        return { rawText: buffer.toString('utf-8'), rows: [], format: 'text', headers: [] };
    }
    throw new Error(`Unsupported file type: ${mimeType}. Supported: PDF, CSV, XLS, XLSX`);
}