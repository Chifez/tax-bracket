import { memo } from 'react'
import type { Message } from '@/types'
import { ExternalLink, Clock, Hash, Zap } from 'lucide-react'
import { StatPill } from './stat-pill'

interface StatsBarProps {
    stats: Message['stats']
    sources?: Message['sources']
}

/**
 * Horizontal bar of response statistics
 */
export const StatsBar = memo(function StatsBar({ stats, sources }: StatsBarProps) {
    if (!stats) return null

    return (
        <div className="flex items-center gap-2 py-2 flex-wrap">
            {sources && sources.length > 0 && (
                <StatPill icon={ExternalLink} label={`${sources.length} sources`} />
            )}
            <StatPill icon={Hash} label={`${stats.words.toLocaleString()} words`} />
            {stats.timeSaved && (
                <StatPill icon={Clock} label={stats.timeSaved} />
            )}
            {stats.cost !== undefined && (
                <StatPill
                    icon={Zap}
                    label={`$${stats.cost.toFixed(2)} saved`}
                    variant="success"
                />
            )}
        </div>
    )
})
