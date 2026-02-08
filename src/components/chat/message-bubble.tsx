import type { Message } from '@/types'
import type { UIMessage } from 'ai'
import { cn } from '@/lib/utils'
import { FileAttachment } from './file-attachment'

interface MessageBubbleProps {
    message: Message | UIMessage
    className?: string
}

/**
 * User message bubble with support for attached files and images
 */
export function MessageBubble({ message, className }: MessageBubbleProps) {
    // Extract text content - handle both old Message format and new UIMessage format
    let textContent = ''

    // Debug log to see message structure
    console.log('MessageBubble received:', message)

    if ('content' in message && typeof message.content === 'string') {
        // Old format: direct content property
        textContent = message.content
    } else if ('parts' in message && Array.isArray(message.parts)) {
        // New format: parts array from AI SDK v6
        textContent = message.parts
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('')
    } else if ('text' in message && typeof (message as any).text === 'string') {
        // Alternative: text property directly on message
        textContent = (message as any).text
    }

    console.log('Extracted text content:', textContent)

    const hasContent = textContent.trim().length > 0

    // Handle attachments from both formats
    const attachments = 'attachments' in message ? message.attachments : undefined
    const hasFiles = attachments && attachments.length > 0

    // If no content at all, don't render anything
    if (!hasContent && !hasFiles) {
        console.warn('MessageBubble: No content or files to display')
        return null
    }

    return (
        <div className={cn('flex justify-end', className)}>
            <div className="max-w-[70%] space-y-2">
                {/* File attachments */}
                {hasFiles && (
                    <div className="flex flex-wrap gap-2 justify-end">
                        {attachments!.map((attachment, idx) => (
                            <FileAttachment
                                key={idx}
                                name={attachment.name}
                                type={attachment.type}
                                size={attachment.size}
                            />
                        ))}
                    </div>
                )}

                {/* Text content */}
                {hasContent && (
                    <div className="bg-neutral-800 text-neutral-100 dark:bg-neutral-700 rounded-2xl px-4 py-2.5">
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                            {textContent}
                        </p>
                    </div>
                )}

                {/* Empty message with only files */}
                {!hasContent && hasFiles && (
                    <div className="text-right">
                        <span className="text-[11px] text-muted-foreground">
                            {attachments!.length} file{attachments!.length > 1 ? 's' : ''} attached
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}