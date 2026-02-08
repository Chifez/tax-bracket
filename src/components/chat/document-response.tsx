import { useState } from 'react'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'
import { FinancialChart } from '@/components/charts'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { StepSection, StatsBar } from './document-response/index'
import type { UIToolInvocation } from 'ai'

/**
 * Extend your persisted Message with live Generative UI tool invocations
 */
interface ExtendedMessage extends Partial<Message> {
    toolInvocations?: UIToolInvocation<any>[]
    content: string
    parts?: Array<{ type: 'text'; text: string } | { type: 'tool-invocation'; toolInvocation: UIToolInvocation<any> }>
    createdAt?: Date | string
}

interface DocumentResponseProps {
    message: ExtendedMessage
    className?: string
}

/**
 * Structured AI response with collapsible sections, charts, and stats
 * Supports both legacy persisted JSON columns and active Generative UI tool invocations
 */
export function DocumentResponse({ message, className }: DocumentResponseProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    // Extract text content from parts array if available (AI SDK v6)
    const textContent = message.parts
        ?.filter(part => part.type === 'text')
        .map(part => part.text)
        .join('') || message.content || ''

    // Live tool invocations (Generative UI)
    const toolInvocations = message.toolInvocations ?? []

    // Tool grouping (AI SDK v6 uses `title`, not `toolName`)
    const sectionTools = toolInvocations.filter(
        t => t.title === 'generate_financial_breakdown'
    )

    const chartTools = toolInvocations.filter(
        t => t.title === 'generate_financial_chart'
    )

    const statsTool = toolInvocations.find(
        t => t.title === 'generate_key_stats'
    )

    // Legacy persisted content
    const legacySections = message.sections ?? []
    const legacyCharts = message.charts ?? []
    const legacyStats = message.stats

    const hasStructuredContent =
        legacySections.length > 0 ||
        sectionTools.length > 0 ||
        legacyCharts.length > 0 ||
        chartTools.length > 0

    const actionCount =
        legacySections.length +
        sectionTools.length +
        legacyCharts.length +
        chartTools.length

    const getToolData = (tool?: UIToolInvocation<any>) => {
        if (!tool) return null
        if (tool.state === 'output-available') return tool.output
        if (tool.state === 'input-streaming' || tool.state === 'input-available') return tool.input
        return null
    }

    const statsData = getToolData(statsTool)

    return (
        <div className={cn('flex gap-3', className)}>
            <div className="flex-1 space-y-2">
                {hasStructuredContent && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                                <Check size={14} className="text-primary" />
                            </div>
                            <div className="text-left">
                                <span className="font-medium text-sm">Completed</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                    Performed {actionCount} actions
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{isExpanded ? 'Hide' : 'Show'}</span>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    'transition-transform',
                                    !isExpanded && '-rotate-90'
                                )}
                            />
                        </div>
                    </button>
                )}

                {(!hasStructuredContent || isExpanded) && (
                    <div className="space-y-4">
                        {/* Text Content */}
                        {textContent && (
                            <div className="px-4 text-sm leading-relaxed whitespace-pre-wrap">
                                {textContent}
                            </div>
                        )}

                        {/* Sections (Legacy) */}
                        {legacySections.map((section, index) => (
                            <StepSection
                                key={section.id}
                                section={section}
                                stepNumber={index + 1}
                                sources={message.sources}
                            />
                        ))}

                        {/* Sections (Generative UI) */}
                        {sectionTools.map((tool, index) => {
                            const section =
                                tool.state === 'input-streaming'
                                    ? tool.input
                                    : tool.state === 'output-available'
                                        ? tool.output
                                        : null

                            if (!section || !section.title) {
                                return (
                                    <div
                                        key={tool.toolCallId}
                                        className="px-4 py-2 flex items-center gap-2 text-muted-foreground text-sm animate-pulse"
                                    >
                                        <Loader2 size={14} className="animate-spin" />
                                        Generating section...
                                    </div>
                                )
                            }

                            return (
                                <StepSection
                                    key={tool.toolCallId}
                                    section={section as any}
                                    stepNumber={legacySections.length + index + 1}
                                    sources={message.sources}
                                />
                            )
                        })}

                        {/* Charts (Legacy) */}
                        {legacyCharts.map(chart => (
                            <FinancialChart key={chart.id} chart={chart} />
                        ))}

                        {/* Charts (Generative UI) */}
                        {chartTools.map(tool => {
                            const chart =
                                tool.state === 'input-streaming'
                                    ? tool.input
                                    : tool.state === 'output-available'
                                        ? tool.output
                                        : null

                            if (!chart || !chart.data) {
                                return (
                                    <div
                                        key={tool.toolCallId}
                                        className="px-4 py-2 flex items-center gap-2 text-muted-foreground text-sm animate-pulse"
                                    >
                                        <Loader2 size={14} className="animate-spin" />
                                        Generating chart...
                                    </div>
                                )
                            }

                            return (
                                <FinancialChart
                                    key={tool.toolCallId}
                                    chart={chart as any}
                                />
                            )
                        })}
                    </div>
                )}

                {/* Stats */}
                {(legacyStats || statsData) && (
                    <StatsBar
                        stats={statsData ?? legacyStats}
                        sources={message.sources}
                    />
                )}

                <span className="text-[11px] text-muted-foreground pl-1">
                    {message.createdAt
                        ? new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })
                        : ''}
                </span>
            </div>
        </div>
    )
}
