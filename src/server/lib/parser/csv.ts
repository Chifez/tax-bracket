import { parse } from 'csv-parse/sync'
import { ParsedFileResult, ParsedRow } from './types'

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
