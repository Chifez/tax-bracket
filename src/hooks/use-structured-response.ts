import type { Message } from '@/types'
import type { UIToolInvocation } from 'ai'
import type { StructuredResponse, UIBlock, Source } from '@/components/chat/blocks/types'
import { useMemo, useRef } from 'react'
import { parsePartialJSON, mergeBlocks } from '@/lib/partial-json-parser'

interface ExtendedMessage extends Partial<Message> {
    toolInvocations?: UIToolInvocation<any>[]
    content?: string
    parts?: Array<any>
    metadata?: any
    sections?: any[]
    charts?: any[]
    stats?: any
    sources?: any[]
}

export function useStructuredResponse(message: ExtendedMessage): StructuredResponse & { partialBlock?: Partial<UIBlock> } {
    const previousBlocksRef = useRef<UIBlock[]>([])

    return useMemo(() => {
        const parts = message.parts || []
        let blockTool = parts.find(
            (p: any) => p.type === 'tool-generate_ui_blocks' || p.toolName === 'generate_ui_blocks' || p.title === 'generate_ui_blocks'
        )

        if (!blockTool) {
            const toolInvocations = message.toolInvocations || []
            blockTool = toolInvocations.find(
                (t: any) => t.toolName === 'generate_ui_blocks' || t.title === 'generate_ui_blocks'
            )
        }

        if (blockTool) {
            const t = blockTool as any

            // AI SDK states can vary between versions (partial-call, result, input-streaming, output-available)
            const toolState = t.state || ''
            const isComplete = toolState === 'output-available' || toolState === 'input-available' || toolState === 'result' || toolState === 'call'
            const isStreaming = !isComplete

            // Prefer 'input'/'args' when streaming, 'output'/'result' when complete
            let data: any = {}
            let rawInput: string | null = null

            if (t.output && Object.keys(t.output).length > 0) {
                data = t.output
            } else if (t.result && Object.keys(t.result).length > 0) {
                data = t.result
            } else if (t.input) {
                // During streaming, input might be a partial JSON string
                if (typeof t.input === 'string') {
                    rawInput = t.input
                } else {
                    data = t.input
                }
            } else if (t.args) {
                if (typeof t.args === 'string') {
                    rawInput = t.args
                } else {
                    data = t.args
                }
            }

            // Use partial JSON parser for streaming
            let blocks: UIBlock[] = []
            let sources: Source[] = []
            let partialBlock: Partial<UIBlock> | undefined

            if (rawInput && isStreaming) {
                // Parse partial JSON to extract blocks incrementally
                const parseResult = parsePartialJSON(rawInput)
                blocks = parseResult.blocks as UIBlock[]
                partialBlock = parseResult.partialBlock as Partial<UIBlock> | undefined

                // Merge with previous blocks to prevent flicker
                blocks = mergeBlocks(previousBlocksRef.current, blocks) as UIBlock[]
                previousBlocksRef.current = blocks
            } else {
                // Complete or already parsed data
                blocks = (data.blocks || []) as UIBlock[]
                sources = (data.sources || []) as Source[]
                previousBlocksRef.current = blocks
            }

            return { blocks, sources, isStreaming, partialBlock }
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
