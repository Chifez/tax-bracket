import type { Message } from '@/types'
import { cn } from '@/lib/utils'
import { FileAttachment } from './file-attachment'

interface MessageBubbleProps {
    message: Message
    className?: string
}

/**
 * User message bubble with support for attached files and images
 */
export function MessageBubble({ message, className }: MessageBubbleProps) {
    const hasContent = message.content.trim().length > 0
    const hasFiles = message.attachments && message.attachments.length > 0

    return (
        <div className={cn('flex justify-end', className)}>
            <div className="max-w-[70%] space-y-2">
                {/* File attachments */}
                {hasFiles && (
                    <div className="flex flex-wrap gap-2 justify-end">
                        {message.attachments!.map((attachment, idx) => (
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
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                )}

                {/* Empty message with only files */}
                {!hasContent && hasFiles && (
                    <div className="text-right">
                        <span className="text-[11px] text-muted-foreground">
                            {message.attachments!.length} file{message.attachments!.length > 1 ? 's' : ''} attached
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
