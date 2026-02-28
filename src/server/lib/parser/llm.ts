import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { TextItem, ColumnDef } from './types'

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

export const HeaderSchema = z.object({
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

export async function detectHeadersWithLLM(mergedRows: TextItem[][]): Promise<{
    headerRowIndex: number
    columns: { originalName: string; standardizedName: string }[]
}> {
    // Send the first 50 rows — headers are always near the top.
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
// item ever falls through the cracks.
// -------------------------------------------------------------------

export function buildColumnDefs(
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
