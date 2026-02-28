export interface ParsedRow {
    [key: string]: string | number | null | undefined
}

export interface ParsedFileResult {
    rawText: string
    rows: ParsedRow[]
    format: 'pdf' | 'csv' | 'xls' | 'xlsx' | 'text'
    headers: string[]
}

export interface TextItem {
    text: string
    x: number
    y: number
    width: number
    height: number
    lineY?: number // Optional: Tesseract's native line bounding box Y
}

export interface ColumnDef {
    originalName: string
    standardizedName: string
    startX: number
    endX: number
}
