import { useState } from 'react'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'
import { FinancialChart } from '@/components/charts'
import { ChevronDown, Check } from 'lucide-react'
import { StepSection, StatsBar } from './document-response/index'

interface DocumentResponseProps {
    message: Message
    className?: string
}

/**
 * Structured AI response with collapsible sections, charts, and stats
 */
export function DocumentResponse({ message, className }: DocumentResponseProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    const hasStructuredContent = message.sections && message.sections.length > 0
    const actionCount = message.sections?.length ?? 0

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
                    <div className="space-y-1">
                        {!hasStructuredContent && (
                            <Card className="p-4">
                                <p className="text-sm leading-relaxed">{message.content}</p>
                            </Card>
                        )}

                        {message.sections?.map((section, index) => (
                            <StepSection
                                key={section.id}
                                section={section}
                                stepNumber={index + 1}
                                sources={message.sources}
                            />
                        ))}

                        {message.charts?.map((chart) => (
                            <FinancialChart key={chart.id} chart={chart} />
                        ))}
                    </div>
                )}

                {message.stats && (
                    <StatsBar stats={message.stats} sources={message.sources} />
                )}

                <span className="text-[11px] text-muted-foreground pl-1">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            </div>
        </div>
    )
}
