import type { Message } from '@/types'
import { cn } from '@/lib/utils'
import { FileText, Image as ImageIcon, File } from 'lucide-react'

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

interface FileAttachmentProps {
    name: string
    type: string
    size?: number
}

function FileAttachment({ name, type, size }: FileAttachmentProps) {
    const isImage = type.startsWith('image/')
    const isPDF = type.includes('pdf')
    const isCSV = type.includes('csv') || name.endsWith('.csv')

    const Icon = isImage ? ImageIcon : (isPDF || isCSV) ? FileText : File
    const bgColor = isPDF ? 'bg-red-500/10' : isCSV ? 'bg-green-500/10' : isImage ? 'bg-blue-500/10' : 'bg-muted'
    const iconColor = isPDF ? 'text-red-500' : isCSV ? 'text-green-500' : isImage ? 'text-blue-500' : 'text-muted-foreground'

    return (
        <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            bgColor
        )}>
            <Icon size={16} className={iconColor} />
            <div className="text-left">
                <p className="text-xs font-medium truncate max-w-[150px]">{name}</p>
                {size && (
                    <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(size)}
                    </p>
                )}
            </div>
        </div>
    )
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
