import type { Message } from '@/types'
import type { UIToolInvocation } from 'ai'
import type { StructuredResponse, UIBlock, Source } from '@/components/chat/blocks/types'
import { useMemo } from 'react'

// Define ExtendedMessage locally as it is an extension for the UI
interface ExtendedMessage extends Partial<Message> {
    toolInvocations?: UIToolInvocation<any>[]
    content: string
    metadata?: any
    sections?: any[]
    charts?: any[]
    stats?: any
    sources?: any[]
}

export function useStructuredResponse(message: ExtendedMessage): StructuredResponse {
    return useMemo(() => {
        // 1. Live Tool Invocations (Streaming)
        // Check for the "generate_ui_blocks" tool
        const toolInvocations = message.toolInvocations || []
        const blockTool = toolInvocations.find(
            t => (t as any).toolName === 'generate_ui_blocks' || (t as any).title === 'generate_ui_blocks'
        )

        if (blockTool) {
            // Prefer output (final), fallback to input (streaming)
            // Vercel AI SDK v6+ uses 'state', 'input', 'output'?
            // Actually, UIToolInvocation might vary. Let's cast to any to be safe if types are fighting,
            // or use standard ToolInvocation properties if known.
            // Based on error: 'args' -> 'input', 'result' -> 'output' (maybe?)
            // and state 'result' -> 'output-available'? (The error listed: input-streaming, input-available, approval-requested, output-available, output-error...)

            const t = blockTool as any
            const data = (t.state === 'result' || t.state === 'output-available' ? (t.output || t.result) : (t.input || t.args)) || {}
            // Fallback to 'args'/'result' just in case the type definition was the only thing wrong but runtime still has them? 
            // But actually SDK v6 uses 'args' in some places? No, useChat 'toolInvocations' usually has 'args'.
            // Wait, the error said property 'args' does not exist on type... 
            // It said 'input' exists. So we use 'input'.

            // For streaming UI, we often want the 'args' while it's building.
            // However, 'args' might be partial JSON. 
            // In strict tool calling, we might only get valid args when fully parsed or partials if using streamText with toolCall streaming.

            // Let's safe guard against partial data if needed, but 'args' usually provides the object.

            const blocks = (data.blocks || []) as UIBlock[]
            const sources = (data.sources || []) as Source[]

            return { blocks, sources }
        }

        // 2. Persisted Data (Database)
        // We expect the 'metadata' column to contain the 'blocks' and 'sources'
        // 'message.metadata' comes from the DB schema
        let metadata = message.metadata as any

        // Debug hook logic
        console.log('useStructuredResponse hook:', {
            msgId: message.id,
            hasMetadata: !!metadata,
            metadataType: typeof metadata,
            metadataKeys: metadata ? Object.keys(metadata) : []
        })

        if (metadata) {
            // Handle double-serialized JSON if necessary
            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata)
                } catch (e) {
                    console.error('Failed to parse metadata string', e)
                }
            }

            if (metadata.blocks || metadata.sources) {
                console.log('Found blocks in metadata:', metadata.blocks?.length)
                return {
                    blocks: (metadata.blocks || []) as UIBlock[],
                    sources: (metadata.sources || []) as Source[]
                }
            }
        }

        // 3. Fallback (Legacy Compatibility)
        // If we have old-style columns (sections, charts), map them to blocks
        // allowing old messages to render in the new system
        const legacyBlocks: UIBlock[] = []

        // Text content -> TextBlock
        const textContent = message.content
        if (textContent) {
            legacyBlocks.push({ type: 'text', content: textContent })
        }

        // Legacy Sections -> SectionBlocks
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

        // Legacy Charts -> ChartBlocks
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

        // Legacy Stats -> StatsBlock
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
