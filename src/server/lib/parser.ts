// @ts-ignore
import pdf from 'pdf-parse'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface ParsedRow {
    [key: string]: string | number | null | undefined
}

export interface ParsedFileResult {
    rawText: string                // Full text for audit storage
    rows: ParsedRow[]              // Structured row data
    format: 'pdf' | 'csv' | 'xls' | 'xlsx' | 'text'
    headers: string[]              // Detected column headers
}

// -------------------------------------------------------------------
// PDF Parsing
// -------------------------------------------------------------------

export async function parsePdf(buffer: Buffer): Promise<ParsedFileResult> {
    const data = await pdf(buffer)
    const rawText = data.text as string

    // Attempt to extract tabular data from PDF text lines
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    const rows: ParsedRow[] = []
    let headers: string[] = []

    // Heuristic: find the first line with multiple tab/space-separated columns
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(/\t+|\s{2,}/).filter(Boolean)
        if (parts.length >= 3 && !headers.length) {
            // This looks like a header row
            headers = parts.map(h => h.toLowerCase().trim())
            continue
        }
        if (headers.length && parts.length >= 3) {
            const row: ParsedRow = {}
            headers.forEach((h, idx) => {
                row[h] = parts[idx] ?? null
            })
            rows.push(row)
        }
    }

    return { rawText, rows, format: 'pdf', headers }
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
    })

    const rawText = JSON.stringify(records, null, 2)
    const headers = records.length > 0
        ? Object.keys(records[0]).map(h => h.toLowerCase().trim())
        : []

    // Normalize header keys to lowercase
    const normalizedRows = records.map(row => {
        const normalized: ParsedRow = {}
        for (const [key, value] of Object.entries(row)) {
            normalized[key.toLowerCase().trim()] = value
        }
        return normalized
    })

    return { rawText, rows: normalizedRows, format: 'csv', headers }
}

// -------------------------------------------------------------------
// XLS/XLSX Parsing
// -------------------------------------------------------------------

export async function parseXlsx(buffer: Buffer): Promise<ParsedFileResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    // Use the first sheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
        return { rawText: '', rows: [], format: 'xlsx', headers: [] }
    }

    const sheet = workbook.Sheets[sheetName]
    const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

    if (jsonData.length === 0) {
        return { rawText: '', rows: [], format: 'xlsx', headers: [] }
    }

    // First row = headers
    const rawHeaders = (jsonData[0] || []).map((h: any) =>
        String(h ?? '').toLowerCase().trim()
    )
    const headers = rawHeaders.filter(Boolean)

    const rows: ParsedRow[] = []
    for (let i = 1; i < jsonData.length; i++) {
        const rowData = jsonData[i]
        if (!rowData || rowData.every((cell: any) => cell === null || cell === '')) continue

        const row: ParsedRow = {}
        rawHeaders.forEach((h: string, idx: number) => {
            if (h) {
                row[h] = rowData[idx] ?? null
            }
        })
        rows.push(row)
    }

    // Generate raw text for audit
    const rawText = XLSX.utils.sheet_to_csv(sheet)

    return { rawText, rows, format: 'xlsx', headers }
}

// -------------------------------------------------------------------
// Unified Parser
// -------------------------------------------------------------------

const XLSX_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
]

export async function parseFile(buffer: Buffer, mimeType: string): Promise<ParsedFileResult> {
    if (mimeType === 'application/pdf') {
        return parsePdf(buffer)
    }
    if (mimeType === 'text/csv') {
        return parseCsv(buffer)
    }
    if (XLSX_MIME_TYPES.includes(mimeType)) {
        return parseXlsx(buffer)
    }
    // Fallback for plain text
    if (mimeType.startsWith('text/')) {
        const text = buffer.toString('utf-8')
        return { rawText: text, rows: [], format: 'text', headers: [] }
    }
    throw new Error(`Unsupported file type: ${mimeType}. Supported: PDF, CSV, XLS, XLSX`)
}
