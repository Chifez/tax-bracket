import { cn } from '@/lib/utils'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
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
    
    // Track if this message was ever in a streaming state
    // This ensures "Generating Response" stays visible until blocks actually appear
    const wasStreamingRef = useRef(false)
    const previousParentIsStreamingRef = useRef<boolean | undefined>(undefined)
    const messageIdRef = useRef<string | undefined>(message.id)
    
    // Reset refs when message changes
    useEffect(() => {
        if (messageIdRef.current !== message.id) {
            wasStreamingRef.current = false
            previousParentIsStreamingRef.current = undefined
            messageIdRef.current = message.id
        }
    }, [message.id])
    
    // Update refs when parent streaming status changes
    useEffect(() => {
        if (parentIsStreaming === true) {
            wasStreamingRef.current = true
        }
        previousParentIsStreamingRef.current = parentIsStreaming
    }, [parentIsStreaming])

    const blockCount = blocks.length

    // Determine streaming state:
    // 1. If parent says we're streaming, we're streaming
    // 2. If parent was streaming but is now false, AND we have no blocks yet, keep streaming (waiting for blocks)
    // 3. Once blocks appear, stop streaming
    // 4. Fall back to hook detection if parent status not provided
    let isStreaming: boolean
    if (parentIsStreaming !== undefined) {
        if (parentIsStreaming) {
            isStreaming = true
        } else {
            // Parent says not streaming, but if we were streaming and have no blocks yet, keep showing "Generating Response"
            isStreaming = wasStreamingRef.current && blockCount === 0
        }
    } else {
        isStreaming = hookIsStreaming
    }

    // Show header when:
    // - We have blocks to show
    // - OR we're actively streaming (from parent status OR toolInvocations exist)
    // DON'T show header when:
    // - Message is empty with no toolInvocations and not streaming (ThinkingAnimation handles that state)
    const hasToolInvocations = message.toolInvocations && message.toolInvocations.length > 0
    const showHeader = blockCount > 0 || isStreaming || hasToolInvocations

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
