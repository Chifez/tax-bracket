import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'
import { useState } from 'react'
import type { Message } from '@/types'
import { useStructuredResponse } from '@/hooks/use-structured-response'
import { BlockRenderer } from './blocks/block-renderer'
import type { UIToolInvocation } from 'ai'

interface ExtendedMessage extends Partial<Message> {
    toolInvocations?: UIToolInvocation<any>[]
    content: string
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
}

export function DocumentResponse({ message, className }: DocumentResponseProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const { blocks, sources } = useStructuredResponse(message)

    console.log('DocumentResponse:', {
        messageId: message.id,
        hasMetadata: !!message.metadata,
        metadataKeys: message.metadata ? Object.keys(message.metadata) : [],
        blocksCount: blocks.length,
        toolInvocations: message.toolInvocations?.length
    })

    const blockCount = blocks.length

    return (
        <div className={cn('flex gap-3', className)}>
            <div className="flex-1 space-y-2">
                {blockCount > 0 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                                <Check size={14} className="text-primary" />
                            </div>
                            <div className="text-left">
                                <span className="font-medium text-sm">Response Generated</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                    {blockCount} blocks
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

                {isExpanded && (
                    <div className="space-y-4">
                        {blocks.map((block, index) => (
                            <BlockRenderer
                                key={`${block.type}-${index}`}
                                block={block}
                                index={index}
                                sources={sources}
                            />
                        ))}
                    </div>
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
