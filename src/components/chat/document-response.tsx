import { useState } from 'react'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'
import { FinancialChart } from '@/components/charts'
import { ChevronDown, Check } from 'lucide-react'
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

    // Live tool invocations (Generative UI)
    const toolInvocations = message.toolInvocations ?? []

    // 1. Monolithic Tool (New Strategy)
    const structuredTool = toolInvocations.find(
        t => (t as any).toolName === 'generate_structured_response' || t.title === 'generate_structured_response'
    )

    // Extract data from monolithic tool (handles both streaming input and final output)
    const getStructuredData = () => {
        if (!structuredTool) return null
        // Prefer output if available (final state), otherwise use input (streaming state)
        if (structuredTool.state === 'output-available') return structuredTool.output
        if (structuredTool.state === 'input-streaming' || structuredTool.state === 'input-available') return structuredTool.input
        return null
    }

    const structuredData = getStructuredData()

    // 2. Legacy/Fallback Content
    // Legacy persisted content or standard text content
    const legacyTextContent = message.parts
        ?.filter(part => part.type === 'text')
        .map(part => part.text)
        .join('') || message.content || ''

    const legacySections = message.sections ?? []
    const legacyCharts = message.charts ?? []
    const legacyStats = message.stats

    // 3. Consolidated Data
    // Use structured tool explanation if available, otherwise legacy text
    const textContent = structuredData?.explanation || legacyTextContent

    // Combine sections/charts/sources from both sources (though typically only one exists)
    const sections = structuredData?.sections || legacySections
    const charts = structuredData?.charts || legacyCharts
    const stats = structuredData?.stats || legacyStats
    const sources = structuredData?.sources || message.sources

    const hasStructuredContent = sections.length > 0 || charts.length > 0

    const actionCount = sections.length + charts.length

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
                                <span className="font-medium text-sm">Analysis Complete</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                    Generated {actionCount} items
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

                {/* Main Content Area */}
                <div className="space-y-4">
                    {/* Explanation Text */}
                    {textContent && (
                        <div className="px-4 text-sm leading-relaxed whitespace-pre-wrap">
                            {textContent}
                        </div>
                    )}

                    {(!hasStructuredContent || isExpanded) && (
                        <>
                            {/* Sections */}
                            {sections?.map((section: any, index: number) => (
                                <StepSection
                                    key={section.id || index}
                                    section={section}
                                    stepNumber={index + 1}
                                    sources={sources}
                                />
                            ))}

                            {/* Charts */}
                            {charts?.map((chart: any, index: number) => (
                                <FinancialChart
                                    key={chart.id || index}
                                    chart={chart}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Stats */}
                {stats && (
                    <StatsBar
                        stats={stats}
                        sources={sources}
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
