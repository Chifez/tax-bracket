import { memo } from 'react'
import { cn } from '@/lib/utils'

interface StatPillProps {
    icon: React.ElementType
    label: string
    variant?: 'default' | 'success'
}

/**
 * Pill-shaped statistic display
 */
export const StatPill = memo(function StatPill({ icon: Icon, label, variant = 'default' }: StatPillProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                variant === 'default' && 'bg-muted text-muted-foreground hover:bg-muted/80',
                variant === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            )}
        >
            <Icon size={12} />
            {label}
        </span>
    )
})
