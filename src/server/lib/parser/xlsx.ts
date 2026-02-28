import * as XLSX from 'xlsx'
import { ParsedFileResult, ParsedRow } from './types'

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
