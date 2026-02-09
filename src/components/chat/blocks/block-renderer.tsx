import { StepSection } from '../document-response/step-section'
import { FinancialChart } from '@/components/charts'
import { StatsBar } from '../document-response/stats-bar'
import type { UIBlock, TextBlock, SectionBlock, ChartBlock, StatsBlock, Source } from './types'
import { cn } from '@/lib/utils'

// --- Sub-Components ---

interface TextRendererProps {
    block: TextBlock
    isStreaming?: boolean
}

function TextRenderer({ block, isStreaming }: TextRendererProps) {
    // Handle partial content during streaming
    if (!block.content && !isStreaming) return null
    
    return (
        <div className={cn(
            "px-4 text-sm leading-relaxed whitespace-pre-wrap max-w-none transition-opacity duration-200",
            isStreaming && "animate-pulse"
        )}>
            {block.content || ''}
            {isStreaming && !block.content && (
                <span className="text-muted-foreground">Generating...</span>
            )}
        </div>
    )
}

interface SectionRendererProps {
    block: SectionBlock
    index: number
    sources?: Source[]
    isStreaming?: boolean
}

function SectionRenderer({ block, index, sources, isStreaming }: SectionRendererProps) {
    // Handle partial section data - ensure required fields have fallbacks
    const safeBlock = {
        ...block,
        id: block.id || `section-${index}`,
        title: block.title || (isStreaming ? 'Loading...' : 'Section'),
        icon: block.icon || 'FileText',
        contents: block.contents || []
    }
    
    return (
        <div className={cn(isStreaming && "animate-pulse")}>
            <StepSection
                section={safeBlock}
                stepNumber={index}
                sources={sources}
            />
        </div>
    )
}

interface ChartRendererProps {
    block: ChartBlock
    isStreaming?: boolean
}

function ChartRenderer({ block, isStreaming }: ChartRendererProps) {
    // Don't render chart until we have essential data
    if (!block.data || !Array.isArray(block.data) || block.data.length === 0) {
        if (isStreaming) {
            return (
                <div className="px-4 py-8 bg-muted/30 rounded-lg animate-pulse">
                    <div className="text-sm text-muted-foreground text-center">
                        Loading chart data...
                    </div>
                </div>
            )
        }
        return null
    }
    
    // Adapter to match FinancialChart props with safe fallbacks
    const chartData = {
        id: block.id || 'chart',
        type: block.chartType || 'bar',
        title: block.title || 'Chart',
        description: block.description || '',
        xKey: block.xKey || 'x',
        yKeys: block.yKeys || ['y'],
        colors: block.colors || ['#3b82f6'],
        data: block.data as any[]
    }

    return (
        <div className={cn(isStreaming && "animate-pulse")}>
            <FinancialChart chart={chartData} />
        </div>
    )
}

interface StatsRendererProps {
    block: StatsBlock
    sources?: Source[]
    isStreaming?: boolean
}

function StatsRenderer({ block, sources, isStreaming }: StatsRendererProps) {
    const statsData = {
        sources: block.sources || 0,
        words: block.words || 0,
        timeSaved: block.timeSaved || '0m'
    }

    return (
        <div className={cn(isStreaming && "animate-pulse")}>
            <StatsBar stats={statsData} sources={sources as any} />
        </div>
    )
}

// --- Main Block Renderer ---

interface BlockRendererProps {
    block: UIBlock
    index: number
    sources?: Source[]
    isStreaming?: boolean
}

export function BlockRenderer({ block, index, sources, isStreaming }: BlockRendererProps) {
    // Handle case where block type might not be defined yet during streaming
    if (!block || !block.type) {
        if (isStreaming) {
            return (
                <div className="px-4 py-4 bg-muted/30 rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
            )
        }
        return null
    }
    
    switch (block.type) {
        case 'text':
            return <TextRenderer block={block} isStreaming={isStreaming} />
        case 'section':
            return <SectionRenderer block={block} index={index} sources={sources} isStreaming={isStreaming} />
        case 'chart':
            return <ChartRenderer block={block} isStreaming={isStreaming} />
        case 'stats':
            return <StatsRenderer block={block} sources={sources} isStreaming={isStreaming} />
        default:
            console.warn('Unknown block type:', (block as any).type)
            return null
    }
}
