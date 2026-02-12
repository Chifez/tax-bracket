import type { ParsedRow } from './parser'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface NormalizedTransaction {
    date: Date
    description: string
    rawDescription: string
    amount: number               // Always positive
    direction: 'credit' | 'debit'
    category: string
    subCategory: string | null
    currency: string
    bankName: string | null
}

// -------------------------------------------------------------------
// Date Normalization
// -------------------------------------------------------------------

/** Common Nigerian bank statement date formats */
const DATE_PATTERNS: Array<{
    regex: RegExp
    parser: (match: RegExpMatchArray) => Date | null
}> = [
        // DD/MM/YYYY or DD-MM-YYYY
        {
            regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
            parser: (m) => {
                const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
                return isNaN(d.getTime()) ? null : d
            }
        },
        // YYYY-MM-DD (ISO)
        {
            regex: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
            parser: (m) => {
                const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
                return isNaN(d.getTime()) ? null : d
            }
        },
        // DD Mon YYYY (e.g., "15 Jan 2025")
        {
            regex: /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})$/i,
            parser: (m) => {
                const months: Record<string, number> = {
                    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
                }
                const month = months[m[2].toLowerCase().slice(0, 3)]
                if (month === undefined) return null
                const d = new Date(Number(m[3]), month, Number(m[1]))
                return isNaN(d.getTime()) ? null : d
            }
        },
        // Mon DD, YYYY (e.g., "Jan 15, 2025")
        {
            regex: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})$/i,
            parser: (m) => {
                const months: Record<string, number> = {
                    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
                }
                const month = months[m[1].toLowerCase().slice(0, 3)]
                if (month === undefined) return null
                const d = new Date(Number(m[3]), month, Number(m[2]))
                return isNaN(d.getTime()) ? null : d
            }
        },
    ]

export function parseDate(value: any): Date | null {
    if (!value) return null

    // Already a Date
    if (value instanceof Date && !isNaN(value.getTime())) return value

    const str = String(value).trim()
    if (!str) return null

    // Try each pattern
    for (const { regex, parser } of DATE_PATTERNS) {
        const match = str.match(regex)
        if (match) {
            const d = parser(match)
            if (d) return d
        }
    }

    // Last resort: native Date parse
    const fallback = new Date(str)
    return isNaN(fallback.getTime()) ? null : fallback
}

// -------------------------------------------------------------------
// Amount Normalization
// -------------------------------------------------------------------

export function parseAmount(value: any): number | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value === 'number') return Math.abs(value)

    const str = String(value).trim()

    // Remove currency symbols and commas
    const cleaned = str
        .replace(/[₦NGN$,]/gi, '')
        .replace(/\s/g, '')
        .replace(/\((.+?)\)/, '-$1') // (500) → -500

    const num = parseFloat(cleaned)
    return isNaN(num) ? null : Math.abs(num)
}

// -------------------------------------------------------------------
// Direction Detection
// -------------------------------------------------------------------

/**
 * Detects credit/debit direction from row data.
 * Looks for explicit debit/credit columns, or infers from amount signs.
 */
export function detectDirection(
    row: ParsedRow,
    headers: string[]
): 'credit' | 'debit' {
    // Check for explicit credit/debit column
    const creditKey = headers.find(h =>
        /^(credit|cr|deposit|money\s*in|inflow)$/i.test(h)
    )
    const debitKey = headers.find(h =>
        /^(debit|dr|withdrawal|money\s*out|outflow)$/i.test(h)
    )

    if (creditKey && debitKey) {
        const creditVal = parseAmount(row[creditKey])
        const debitVal = parseAmount(row[debitKey])
        if (creditVal && creditVal > 0) return 'credit'
        if (debitVal && debitVal > 0) return 'debit'
    }

    // Check for a "type" or "direction" column
    const typeKey = headers.find(h =>
        /^(type|direction|tran[_\s]*type|transaction[_\s]*type)$/i.test(h)
    )
    if (typeKey) {
        const val = String(row[typeKey] || '').toLowerCase()
        if (/credit|cr|deposit|inflow/i.test(val)) return 'credit'
        if (/debit|dr|withdrawal|outflow/i.test(val)) return 'debit'
    }

    // Infer from amount sign
    const amountKey = headers.find(h =>
        /^(amount|value|sum|total)$/i.test(h)
    )
    if (amountKey) {
        const rawVal = String(row[amountKey] || '')
        if (rawVal.includes('(') || rawVal.startsWith('-')) return 'debit'
        return 'credit'
    }

    return 'debit' // Default assumption
}

// -------------------------------------------------------------------
// Amount Extraction (handles split credit/debit columns)
// -------------------------------------------------------------------

export function extractAmount(
    row: ParsedRow,
    headers: string[],
    direction: 'credit' | 'debit'
): number | null {
    // Try split columns first
    const creditKey = headers.find(h =>
        /^(credit|cr|deposit|money\s*in|inflow)$/i.test(h)
    )
    const debitKey = headers.find(h =>
        /^(debit|dr|withdrawal|money\s*out|outflow)$/i.test(h)
    )

    if (creditKey && debitKey) {
        if (direction === 'credit') return parseAmount(row[creditKey])
        return parseAmount(row[debitKey])
    }

    // Single amount column
    const amountKey = headers.find(h =>
        /^(amount|value|sum|total)$/i.test(h)
    )
    if (amountKey) return parseAmount(row[amountKey])

    return null
}

// -------------------------------------------------------------------
// Category Inference (keyword-based, NO AI)
// -------------------------------------------------------------------

interface CategoryRule {
    category: string
    subCategory: string | null
    keywords: RegExp
}

const CATEGORY_RULES: CategoryRule[] = [
    // Income
    { category: 'income', subCategory: 'salary', keywords: /salary|wages|payroll|staff\s*pay/i },
    { category: 'income', subCategory: 'business', keywords: /payment\s*received|invoice|client|sales\s*proceed/i },
    { category: 'income', subCategory: 'rental', keywords: /rent\s*(received|income)|tenant/i },
    { category: 'income', subCategory: 'investment', keywords: /dividend|interest\s*(earned|income|credit)|investment\s*return/i },

    // Bank charges
    { category: 'bank_charges', subCategory: 'stamp_duty', keywords: /stamp\s*duty|emtl|electronic\s*money\s*transfer/i },
    { category: 'bank_charges', subCategory: 'maintenance', keywords: /account\s*maintenance|monthly\s*fee|cot|commission\s*on\s*turnover/i },
    { category: 'bank_charges', subCategory: 'transfer_fee', keywords: /transfer\s*fee|inter[\s-]*bank\s*transfer/i },
    { category: 'bank_charges', subCategory: 'sms_alert', keywords: /sms\s*alert|e[\s-]*alert|notification\s*fee/i },
    { category: 'bank_charges', subCategory: 'card_fee', keywords: /card\s*maintenance|annual\s*card/i },
    { category: 'bank_charges', subCategory: 'atm_fee', keywords: /atm\s*(withdrawal\s*)?fee|inter[\s-]*bank\s*atm/i },

    // Deductions
    { category: 'deduction', subCategory: 'pension', keywords: /pension|pencom|rsf|retirement/i },
    { category: 'deduction', subCategory: 'nhf', keywords: /nhf|national\s*housing/i },
    { category: 'deduction', subCategory: 'nhis', keywords: /nhis|health\s*insurance/i },
    { category: 'deduction', subCategory: 'tax', keywords: /paye|tax\s*deduct|withholding/i },
    { category: 'deduction', subCategory: 'insurance', keywords: /life\s*insurance|insurance\s*premium/i },

    // Expenses
    { category: 'expense', subCategory: 'rent', keywords: /^rent|rent\s*payment|house\s*rent/i },
    { category: 'expense', subCategory: 'utilities', keywords: /electricity|nepa|phcn|water\s*bill|gas\s*bill|dstv|gotv/i },
    { category: 'expense', subCategory: 'transport', keywords: /uber|bolt|fuel|petrol|diesel|transport/i },
    { category: 'expense', subCategory: 'food', keywords: /food|restaurant|grocery|market/i },
    { category: 'expense', subCategory: 'transfer', keywords: /transfer|trf|nip|nibss/i },
]

export function inferCategory(description: string): { category: string; subCategory: string | null } {
    const desc = description.trim()
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.test(desc)) {
            return { category: rule.category, subCategory: rule.subCategory }
        }
    }
    return { category: 'uncategorized', subCategory: null }
}

// -------------------------------------------------------------------
// Description Cleaning
// -------------------------------------------------------------------

export function cleanDescription(raw: string): string {
    return raw
        .replace(/\s+/g, ' ')         // Collapse whitespace
        .replace(/[^\w\s₦.,()\-\/]/g, '') // Remove special chars
        .trim()
        .slice(0, 500)                 // Respect DB column limit
}

// -------------------------------------------------------------------
// Header Detection — find the best-matching columns
// -------------------------------------------------------------------

export interface ColumnMap {
    dateKey: string | null
    descriptionKey: string | null
    amountKey: string | null
    creditKey: string | null
    debitKey: string | null
}

export function detectColumns(headers: string[]): ColumnMap {
    const find = (patterns: RegExp) =>
        headers.find(h => patterns.test(h)) || null

    return {
        dateKey: find(/^(date|tran[_\s]*date|transaction[_\s]*date|value[_\s]*date|post[_\s]*date|posting[_\s]*date)$/i),
        descriptionKey: find(/^(description|narration|particulars|details|remarks|transaction[_\s]*details|memo|reference)$/i),
        amountKey: find(/^(amount|value|sum|total|tran[_\s]*amount)$/i),
        creditKey: find(/^(credit|cr|deposit|money[_\s]*in|inflow|credits)$/i),
        debitKey: find(/^(debit|dr|withdrawal|money[_\s]*out|outflow|debits)$/i),
    }
}

// -------------------------------------------------------------------
// Main Normalizer
// -------------------------------------------------------------------

export function normalizeRows(
    rows: ParsedRow[],
    headers: string[],
    bankName: string | null = null,
): NormalizedTransaction[] {
    const columns = detectColumns(headers)
    const results: NormalizedTransaction[] = []

    for (const row of rows) {
        // Extract date
        const dateKey = columns.dateKey
        if (!dateKey) continue
        const date = parseDate(row[dateKey])
        if (!date) continue

        // Extract description
        const descKey = columns.descriptionKey
        const rawDesc = descKey ? String(row[descKey] || '') : ''
        if (!rawDesc.trim()) continue

        // Detect direction
        const direction = detectDirection(row, headers)

        // Extract amount
        const amount = extractAmount(row, headers, direction)
        if (!amount || amount === 0) continue

        // Categorize
        const { category, subCategory } = inferCategory(rawDesc)

        results.push({
            date,
            description: cleanDescription(rawDesc),
            rawDescription: rawDesc,
            amount,
            direction,
            category,
            subCategory,
            currency: 'NGN',
            bankName,
        })
    }

    return results
}
