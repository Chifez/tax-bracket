import { memo } from 'react'
import { cn } from '@/lib/utils'

interface DataBadgeProps {
    value: string
}

/**
 * Badge for displaying data values with positive/negative styling
 */
export const DataBadge = memo(function DataBadge({ value }: DataBadgeProps) {
    const isPositive = value.includes('+') || value.toLowerCase().includes('increase')
    const isNegative = value.includes('-') || value.toLowerCase().includes('decrease')

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                isPositive && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                isNegative && 'bg-red-500/10 text-red-600 dark:text-red-400',
                !isPositive && !isNegative && 'bg-muted text-foreground'
            )}
        >
            {value}
        </span>
    )
})
