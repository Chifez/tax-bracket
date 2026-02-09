import { StepSection } from '../document-response/step-section'
import { FinancialChart } from '@/components/charts'
import { StatsBar } from '../document-response/stats-bar'
import type { UIBlock, TextBlock, SectionBlock, ChartBlock, StatsBlock, Source } from './types'

// --- Sub-Components ---

function TextRenderer({ block }: { block: TextBlock }) {
    if (!block.content) return null
    return (
        <div className="px-4 text-sm leading-relaxed whitespace-pre-wrap max-w-none">
            {block.content}
        </div>
    )
}

function SectionRenderer({ block, index, sources }: { block: SectionBlock, index: number, sources?: Source[] }) {
    // Map block structure to StepSection props
    // Note: StepSection expects 'section' prop which matches SectionBlock structure mostly
    return (
        <StepSection
            section={block}
            stepNumber={index}
            sources={sources}
        />
    )
}

function ChartRenderer({ block }: { block: ChartBlock }) {
    // Adapter to match FinancialChart props
    const chartData = {
        id: block.id,
        type: block.chartType,
        title: block.title,
        description: block.description,
        xKey: block.xKey,
        yKeys: block.yKeys,
        colors: block.colors,
        data: block.data as any[] // Cast data to any[] to bypass strict ChartData check for now
    }

    return <FinancialChart chart={chartData} />
}

function StatsRenderer({ block, sources }: { block: StatsBlock, sources?: Source[] }) {
    const statsData = {
        sources: block.sources || 0,
        words: block.words || 0,
        timeSaved: block.timeSaved || '0m'
    }

    // Cast sources to match StatsBar requirement (it likely expects the global Source type)
    // We will assume our local Source type is compatible enough or cast it
    return <StatsBar stats={statsData} sources={sources as any} />
}

// --- Main Block Renderer ---

interface BlockRendererProps {
    block: UIBlock
    index: number
    sources?: Source[]
}

export function BlockRenderer({ block, index, sources }: BlockRendererProps) {
    switch (block.type) {
        case 'text':
            return <TextRenderer block={block} />
        case 'section':
            return <SectionRenderer block={block} index={index} sources={sources} />
        case 'chart':
            return <ChartRenderer block={block} />
        case 'stats':
            return <StatsRenderer block={block} sources={sources} />
        default:
            console.warn('Unknown block type:', (block as any).type)
            return null
    }
}
