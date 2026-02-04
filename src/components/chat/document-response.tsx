import { useState } from 'react'
import type { Message, ResponseSection, Source } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'
import { FinancialChart } from '@/components/charts'
import {
    ChevronDown,
    ChevronRight,
    Check,
    TrendingUp,
    DollarSign,
    PieChart,
    AlertCircle,
    FileText,
    ExternalLink,
    Clock,
    Hash,
    Zap,
    Target,
    Calculator,
    Wallet,
    Receipt,
    Lightbulb,
} from 'lucide-react'

interface DocumentResponseProps {
    message: Message
    className?: string
}

// Enhanced icon map with more financial/analytical icons
const iconMap: Record<string, React.ElementType> = {
    'trending-up': TrendingUp,
    'dollar-sign': DollarSign,
    'pie-chart': PieChart,
    'alert-circle': AlertCircle,
    'file-text': FileText,
    'check': Check,
    'target': Target,
    'calculator': Calculator,
    'wallet': Wallet,
    'receipt': Receipt,
    'lightbulb': Lightbulb,
}

/**
 * AI response rendered as a structured document
 * Matches Valyu.ai reference with collapsible steps, source badges, and rich formatting
 */
export function DocumentResponse({ message, className }: DocumentResponseProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    const hasStructuredContent = message.sections && message.sections.length > 0
    const actionCount = message.sections?.length ?? 0

    return (
        <div className={cn('flex gap-3', className)}>
            {/* Response Content */}
            <div className="flex-1 space-y-2">
                {/* Collapsible Header */}
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

                {/* Expanded Content */}
                {(!hasStructuredContent || isExpanded) && (
                    <div className="space-y-1">
                        {/* Simple text content */}
                        {!hasStructuredContent && (
                            <Card className="p-4">
                                <p className="text-sm leading-relaxed">{message.content}</p>
                            </Card>
                        )}

                        {/* Structured sections as collapsible steps */}
                        {message.sections?.map((section, index) => (
                            <StepSection
                                key={section.id}
                                section={section}
                                stepNumber={index + 1}
                                sources={message.sources}
                            />
                        ))}

                        {/* Inline Charts */}
                        {message.charts?.map((chart) => (
                            <FinancialChart key={chart.id} chart={chart} />
                        ))}
                    </div>
                )}

                {/* Stats Bar */}
                {message.stats && (
                    <StatsBar stats={message.stats} sources={message.sources} />
                )}

                {/* Timestamp */}
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

// Step section with expand/collapse and nested content
function StepSection({
    section,
    stepNumber,
    sources,
}: {
    section: ResponseSection
    stepNumber: number
    sources?: Source[]
}) {
    const [isOpen, setIsOpen] = useState(true)
    const Icon = section.icon ? iconMap[section.icon] || FileText : FileText

    return (
        <div className="border-l-2 border-border pl-4 ml-3">
            {/* Step Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 py-2 w-full text-left group"
            >
                <ChevronRight
                    size={14}
                    className={cn(
                        'text-muted-foreground transition-transform shrink-0',
                        isOpen && 'rotate-90'
                    )}
                />
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                    {stepNumber}
                </div>
                <Icon size={14} className="text-primary shrink-0" />
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                    {section.title}
                </span>
            </button>

            {/* Step Content */}
            {isOpen && (
                <div className="pl-9 pb-3 space-y-2">
                    {section.contents.map((content, idx) => (
                        <ContentBlock key={idx} content={content} />
                    ))}

                    {/* Show relevant sources */}
                    {sources && sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {sources.slice(0, 2).map((source) => (
                                <SourceBadge key={source.id} source={source} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// Content block renderer with rich formatting
function ContentBlock({ content }: { content: ResponseSection['contents'][0] }) {
    if (content.type === 'text') {
        return (
            <p className="text-[13px] text-muted-foreground leading-relaxed">
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
}

// Format text with inline highlights for numbers and percentages
function formatTextWithHighlights(text: string): React.ReactNode {
    // Match currency values, percentages, and standalone numbers
    const parts = text.split(/(₦[\d,]+(?:\.\d{2})?|\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d+)?%|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b)/g)

    return parts.map((part, idx) => {
        if (/^[₦$]|^\d+(\.\d+)?%$|^\d{1,3}(,\d{3})*(\.\d+)?$/.test(part)) {
            return (
                <span key={idx} className="font-medium text-foreground">
                    {part}
                </span>
            )
        }
        return part
    })
}

// Data badge for key values
function DataBadge({ value }: { value: string }) {
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
}

// Source citation badge
function SourceBadge({ source }: { source: Source }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800 text-neutral-200 text-[11px] font-medium dark:bg-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {source.title}
        </span>
    )
}

// Stats bar with pill buttons
function StatsBar({
    stats,
    sources
}: {
    stats: Message['stats']
    sources?: Message['sources']
}) {
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
}

// Individual stat pill
function StatPill({
    icon: Icon,
    label,
    variant = 'default'
}: {
    icon: React.ElementType
    label: string
    variant?: 'default' | 'success'
}) {
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
}
