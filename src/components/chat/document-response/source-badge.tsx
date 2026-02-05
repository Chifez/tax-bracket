import { memo } from 'react'
import type { Source } from '@/types'

interface SourceBadgeProps {
    source: Source
}

/**
 * Badge for displaying source references
 */
export const SourceBadge = memo(function SourceBadge({ source }: SourceBadgeProps) {
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800 text-neutral-200 text-[11px] font-medium dark:bg-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {source.title}
        </span>
    )
})
