/**
 * TaxBracket Data Models
 * These types mirror the expected backend API response structure
 */

// ========================================
// Transaction Model (from PRD section 7)
// ========================================

export type TransactionDirection = 'credit' | 'debit'

export interface Transaction {
    id: string
    date: string // ISO date string
    description: string
    amount: number
    direction: TransactionDirection
    category: string
    subCategory?: string
    sourceAccount: string
    bankName: string
    statementPeriod: {
        start: string
        end: string
    }
}

// ========================================
// Chat & Message Models
// ========================================

export type MessageRole = 'user' | 'assistant'
export type ResponseMode = 'quick' | 'explained' | 'report'

export interface Source {
    id: string
    title: string
    type: 'document' | 'calculation' | 'external'
    reference?: string
}

export interface MessageAttachment {
    name: string
    type: string
    size?: number
    url?: string
}

export interface ChartData {
    id: string
    type: 'line' | 'bar' | 'area' | 'multi-line'
    title: string
    description?: string
    dateRange?: string
    data: Array<{ label: string; value: number;[key: string]: unknown }>
    xKey?: string
    yKeys?: string[]
    colors?: string[]
}

export interface SectionContent {
    type: 'text' | 'list' | 'key-value' | 'chart' | 'table'
    content: unknown
}

export interface ResponseSection {
    id: string
    title: string
    icon?: string // Lucide icon name
    contents: SectionContent[]
}

export interface MessageStats {
    sources: number
    words: number
    timeSaved?: string
    cost?: number
}

export interface Message {
    id: string
    role: MessageRole
    content: string
    timestamp: string // ISO date string

    // Only for assistant messages
    responseMode?: ResponseMode
    sections?: ResponseSection[]
    charts?: ChartData[]
    sources?: Source[]
    stats?: MessageStats

    // User attachments
    attachments?: MessageAttachment[]

    // Processing state
    isStreaming?: boolean
}

export interface Chat {
    id: string
    title: string
    createdAt: string
    updatedAt: string
    messages: Message[]
}

// ========================================
// File Upload Models
// ========================================

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'complete' | 'error'

export interface UploadedFile {
    id: string
    name: string
    size: number
    type: string
    status: UploadStatus
    progress: number
    error?: string
    bankName?: string
    statementPeriod?: {
        start: string
        end: string
    }
}

// ========================================
// Financial Summary Models
// ========================================

export interface FinancialSummary {
    totalIncome: number
    totalExpenses: number
    totalBankCharges: number
    netBalance: number
    taxableIncome: number
    estimatedTax: number
    period: {
        start: string
        end: string
    }
}

export interface MonthlyBreakdown {
    month: string // YYYY-MM format
    income: number
    expenses: number
    bankCharges: number
    netBalance: number
}

// ========================================
// Tax Report Models
// ========================================

export interface TaxReport {
    id: string
    generatedAt: string
    period: {
        start: string
        end: string
    }
    taxpayer: {
        name?: string
        tin?: string
    }
    summary: FinancialSummary
    monthlyBreakdown: MonthlyBreakdown[]
    deductions: Array<{
        category: string
        amount: number
        description: string
    }>
    assumptions: string[]
    disclaimer: string
}
