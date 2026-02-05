import { createElement, type ReactNode } from 'react'

/**
 * Format a number as abbreviated currency (Nigerian Naira)
 * Examples: ₦1.5M, ₦500K, ₦1,234
 */
export function formatValue(value: number | undefined): string {
    if (value === undefined) {
        return 'N/A'
    }
    if (value >= 1000000) {
        return `₦${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
        return `₦${(value / 1000).toFixed(0)}K`
    }
    return `₦${value.toLocaleString()}`
}

/**
 * Format a chart series name for display
 * Converts camelCase/snake_case to Title Case
 */
export function formatSeriesName(name: string): string {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .trim()
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format text with highlighted currency/percentage values
 * Wraps numbers, currency, and percentages in styled spans
 */
export function formatTextWithHighlights(text: string): ReactNode {
    const pattern = /(₦[\d,]+(?:\.\d{2})?|\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d+)?%|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b)/g
    const parts = text.split(pattern)

    return parts.map((part, idx) => {
        if (/^[₦$]|^\d+(\.\d+)?%$|^\d{1,3}(,\d{3})*(\.\d+)?$/.test(part)) {
            return createElement('span', { key: idx, className: 'font-medium text-foreground' }, part)
        }
        return part
    })
}
