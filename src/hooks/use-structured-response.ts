import type { Message } from '@/types'
import type { UIToolInvocation } from 'ai'
import type { StructuredResponse, UIBlock, Source } from '@/components/chat/blocks/types'
import { useMemo } from 'react'

// Define ExtendedMessage locally as it is an extension for the UI
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
        // 1. Live Tool Invocations (Streaming)
        // Check for the "generate_ui_blocks" tool
        const toolInvocations = message.toolInvocations || []
        // #region agent log
        if (message.role === 'assistant') {
            fetch('http://127.0.0.1:7242/ingest/8349c17a-640e-4305-bf28-6c651baadf11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-structured-response.ts:22',message:'Checking tool invocations',data:{toolInvocationsCount:toolInvocations.length,toolNames:toolInvocations.map((t:any)=>t.toolName||t.title||'unknown'),hasBlockTool:!!toolInvocations.find((t:any)=>(t.toolName==='generate_ui_blocks'||t.title==='generate_ui_blocks'))},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        }
        // #endregion
        const blockTool = toolInvocations.find(
            t => (t as any).toolName === 'generate_ui_blocks' || (t as any).title === 'generate_ui_blocks'
        )

        if (blockTool) {
            const t = blockTool as any

            // Determine streaming state based on tool invocation state
            // AI SDK v6 states: 'partial-call', 'call', 'result'
            // AI SDK v5 states: 'input-streaming', 'input-available', 'output-available'
            const toolState = t.state || ''
            // 'call' and 'result' states mean the tool call is complete
            const isComplete = toolState === 'result' || toolState === 'call'
            // If not complete, we're still streaming
            const isStreaming = !isComplete

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/8349c17a-640e-4305-bf28-6c651baadf11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-structured-response.ts:27',message:'Block tool detected - streaming state',data:{toolState,isComplete,isStreaming,hasInput:!!t.input,hasOutput:!!t.output,hasResult:!!t.result,hasArgs:!!t.args,inputKeys:t.input?Object.keys(t.input):[],outputKeys:t.output?Object.keys(t.output):[]},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion

            // For streaming: prefer 'input' or 'args' when streaming, 'output'/'result' when complete
            // During streaming, data arrives incrementally in input/args
            // For 'call' state (UI tools), the data is in 'input' or 'args'
            let data: any = {}

            if (t.output && Object.keys(t.output).length > 0) {
                // Tool has output, use it
                data = t.output
            } else if (t.result && Object.keys(t.result).length > 0) {
                // Tool has result, use it
                data = t.result
            } else if (t.input) {
                // Tool is streaming or 'call' state, use input
                data = t.input
            } else if (t.args) {
                // Fallback to args
                data = t.args
            }

            const blocks = (data.blocks || []) as UIBlock[]
            const sources = (data.sources || []) as Source[]

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/8349c17a-640e-4305-bf28-6c651baadf11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-structured-response.ts:58',message:'Returning structured response',data:{blocksCount:blocks.length,isStreaming,hasSources:!!sources.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion

            return { blocks, sources, isStreaming }
        }

        // 2. Persisted Data (Database)
        // We expect the 'metadata' column to contain the 'blocks' and 'sources'
        // 'message.metadata' comes from the DB schema
        let metadata = message.metadata as any

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
        // Check both 'content' string and 'parts' array (UIMessage format)
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
