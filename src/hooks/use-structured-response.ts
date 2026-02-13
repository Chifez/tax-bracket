import type { Message } from '@/types'
import type { UIToolInvocation } from 'ai'
import type { StructuredResponse, UIBlock, Source } from '@/components/chat/blocks/types'
import { useMemo } from 'react'

interface ExtendedMessage extends Partial<Message> {
    toolInvocations?: UIToolInvocation<any>[]
    content?: string
    parts?: Array<{ type: string; text?: string }>
    metadata?: any
    sections?: any[]
    charts?: any[]
    stats?: any
    sources?: any[]
}

export function useStructuredResponse(message: ExtendedMessage): StructuredResponse {
    return useMemo(() => {
        const toolInvocations = message.toolInvocations || []
        const blockTool = toolInvocations.find(
            t => (t as any).toolName === 'generate_ui_blocks' || (t as any).title === 'generate_ui_blocks'
        )

        if (blockTool) {
            const t = blockTool as any

            // AI SDK v6 states: 'partial-call', 'call', 'result'
            // AI SDK v5 states: 'input-streaming', 'input-available', 'output-available'
            const toolState = t.state || ''
            const isComplete = toolState === 'result' || toolState === 'call'
            const isStreaming = !isComplete

            // Prefer 'input'/'args' when streaming, 'output'/'result' when complete
            let data: any = {}

            if (t.output && Object.keys(t.output).length > 0) {
                data = t.output
            } else if (t.result && Object.keys(t.result).length > 0) {
                data = t.result
            } else if (t.input) {
                data = t.input
            } else if (t.args) {
                data = t.args
            }

            const blocks = (data.blocks || []) as UIBlock[]
            const sources = (data.sources || []) as Source[]

            return { blocks, sources, isStreaming }
        }

        let metadata = message.metadata as any

        if (metadata) {
            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata)
                } catch (e) {
                    console.error('Failed to parse metadata string', e)
                }
            }

            if (metadata.blocks || metadata.sources) {
                return {
                    blocks: (metadata.blocks || []) as UIBlock[],
                    sources: (metadata.sources || []) as Source[]
                }
            }
        }

        // Legacy compatibility: map old sections/charts to blocks
        const legacyBlocks: UIBlock[] = []

        let textContent = message.content || ''
        if (!textContent && message.parts) {
            textContent = message.parts
                .filter(p => p.type === 'text' && p.text)
                .map(p => p.text)
                .join('')
        }
        if (textContent) {
            legacyBlocks.push({ type: 'text', content: textContent })
        }

        if (message.sections && Array.isArray(message.sections)) {
            message.sections.forEach((section: any) => {
                legacyBlocks.push({
                    type: 'section',
                    id: section.id,
                    title: section.title,
                    icon: section.icon,
                    contents: section.contents
                })
            })
        }

        if (message.charts && Array.isArray(message.charts)) {
            message.charts.forEach((chart: any) => {
                legacyBlocks.push({
                    type: 'chart',
                    id: chart.id,
                    chartType: chart.type,
                    title: chart.title,
                    description: chart.description,
                    xKey: chart.xKey,
                    yKeys: chart.yKeys,
                    colors: chart.colors,
                    data: chart.data
                })
            })
        }

        if (message.stats) {
            legacyBlocks.push({
                type: 'stats',
                ...message.stats as any
            })
        }

        return {
            blocks: legacyBlocks,
            sources: (message.sources || []) as Source[]
        }

    }, [message, message.toolInvocations, message.content, message.metadata])
}
