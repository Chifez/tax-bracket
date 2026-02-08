// @ts-ignore
import pdf from 'pdf-parse'
import { parse } from 'csv-parse/sync'

export async function parsePdf(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer)
    return data.text
}

export async function parseCsv(buffer: Buffer): Promise<string> {
    const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true
    })
    return JSON.stringify(records, null, 2)
}

export async function parseFile(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
        return parsePdf(buffer)
    }
    if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
        return parseCsv(buffer)
    }
    // Fallback for text
    if (mimeType.startsWith('text/')) {
        return buffer.toString('utf-8')
    }
    throw new Error(`Unsupported file type: ${mimeType}`)
}
