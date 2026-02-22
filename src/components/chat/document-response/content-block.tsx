import { memo } from 'react'
import type { ResponseSection } from '@/types'
import { formatTextWithHighlights } from '@/lib/format'
import { DataBadge } from './data-badge'

interface ContentBlockProps {
    content: ResponseSection['contents'][0]
}

/**
 * Renders different content types (text, list, key-value)
 */
export const ContentBlock = memo(function ContentBlock({ content }: ContentBlockProps) {
    if (content.type === 'text') {
        return (
            <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {content.content as string}
            </p>
        )
    }

    if (content.type === 'list') {
        const items = content.content as string[]
        return (
            <ul className="space-y-1.5">
                {items.map((item, idx) => (
                    <li key={idx} className="text-[13px] text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        <span className="leading-relaxed">{formatTextWithHighlights(item)}</span>
                    </li>
                ))}
            </ul>
        )
    }

    if (content.type === 'key-value') {
        const data = content.content as Record<string, string>
        return (
            <div className="space-y-1.5">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-2 text-[13px]">
                        <span className="text-muted-foreground">{key}:</span>
                        <DataBadge value={value} />
                    </div>
                ))}
            </div>
        )
    }

    return null
})
