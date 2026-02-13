import { cn } from '@/lib/utils'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { Message } from '@/types'
import { useStructuredResponse } from '@/hooks/use-structured-response'
import { BlockRenderer } from './blocks/block-renderer'
import type { UIToolInvocation } from 'ai'

interface ExtendedMessage extends Partial<Message> {
    toolInvocations?: UIToolInvocation<any>[]
    content?: string
    parts?: Array<{ type: string; text?: string }>
    metadata?: any
    sections?: any[]
    charts?: any[]
    stats?: any
    sources?: any[]
    createdAt?: Date | string
}

interface DocumentResponseProps {
    message: ExtendedMessage
    className?: string
    isStreaming?: boolean // Pass streaming status from parent (status === 'streaming')
}

export function DocumentResponse({ message, className, isStreaming: parentIsStreaming }: DocumentResponseProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const { blocks, sources, isStreaming: hookIsStreaming } = useStructuredResponse(message)

    const blockCount = blocks.length

    // Use parent streaming status if provided, otherwise fall back to hook detection
    // This ensures we show "Generating Response" even when tool invocations haven't appeared yet
    const isStreaming = parentIsStreaming !== undefined ? parentIsStreaming : hookIsStreaming

    // Show header when:
    // - We have blocks to show
    // - OR we're actively streaming (from parent status OR toolInvocations exist)
    // DON'T show header when:
    // - Message is empty with no toolInvocations and not streaming (ThinkingAnimation handles that state)
    const hasToolInvocations = message.toolInvocations && message.toolInvocations.length > 0
    const showHeader = blockCount > 0 || isStreaming || hasToolInvocations

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8349c17a-640e-4305-bf28-6c651baadf11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'document-response.tsx:42',message:'DocumentResponse render - header visibility',data:{blockCount,isStreaming,hookIsStreaming,parentIsStreaming,hasToolInvocations,showHeader,toolInvocationsCount:message.toolInvocations?.length||0,messageId:message.id},timestamp:Date.now(),runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    return (
        <div className={cn('flex gap-3', className)}>
            <div className="flex-1 space-y-2">
                {showHeader && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex items-center justify-center w-6 h-6 rounded-full",
                                isStreaming ? "bg-blue-500/10" : "bg-primary/10"
                            )}>
                                {isStreaming ? (
                                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                                ) : (
                                    <Check size={14} className="text-primary" />
                                )}
                            </div>
                            <div className="text-left">
                                <span className="font-medium text-sm">
                                    {isStreaming ? 'Generating Response...' : 'Response Generated'}
                                </span>
                                {blockCount > 0 && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                        {blockCount} block{blockCount !== 1 ? 's' : ''}
                                        {isStreaming && ' so far'}
                                    </span>
                                )}
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

                {isExpanded && blockCount > 0 && (
                    <div className="space-y-4">
                        {blocks.map((block, index) => (
                            <BlockRenderer
                                key={`${block.type}-${index}`}
                                block={block}
                                index={index}
                                sources={sources}
                                isStreaming={isStreaming && index === blocks.length - 1}
                            />
                        ))}
                    </div>
                )}

                {!isStreaming && message.createdAt && (
                    <span className="text-[11px] text-muted-foreground pl-1">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                )}
            </div>
        </div>
    )
}
