import { parsePdf } from './pdf';
import { parseCsv } from './csv';
import { parseXlsx } from './xlsx';
import { ParsedFileResult } from './types';

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

export * from './types';
export * from './utils';
export * from './pdf';
export * from './csv';
export * from './xlsx';
export * from './llm';
