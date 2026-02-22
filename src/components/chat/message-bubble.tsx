import type { Message } from '@/types'
import type { UIMessage } from 'ai'
import { cn } from '@/lib/utils'
import { FileAttachment } from './file-attachment'
import { useState } from 'react'
import { Pencil, X, Check } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'

interface MessageBubbleProps {
    message: Message | UIMessage
    className?: string
    onEdit?: (newContent: string) => void
    isProcessing?: boolean
}

/**
 * User message bubble with support for attached files and images
 */
export function MessageBubble({ message, className, onEdit, isProcessing }: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
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

    if (!hasContent && !hasFiles) {
        console.warn('MessageBubble: No content or files to display')
        return null
    }

    const handleEditStart = () => {
        setEditContent(textContent)
        setIsEditing(true)
    }

    const handleEditCancel = () => {
        setIsEditing(false)
        setEditContent(textContent)
    }

    const handleEditSave = () => {
        if (editContent.trim() && editContent !== textContent && onEdit) {
            onEdit(editContent)
        }
        setIsEditing(false)
    }

    return (
        <div className={cn('flex justify-end group', className)}>
            <div className="max-w-[70%] space-y-2 w-full flex flex-col items-end">
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
                {hasContent && !isEditing && (
                    <div className="relative">
                        <div className="bg-neutral-800 text-neutral-100 dark:bg-neutral-700 rounded-2xl px-4 py-2.5">
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                                {textContent}
                            </p>
                        </div>
                        {onEdit && !isProcessing && (
                            <button
                                onClick={handleEditStart}
                                className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity rounded-full hover:bg-muted"
                                title="Edit message"
                            >
                                <Pencil size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Edit content */}
                {isEditing && (
                    <div className="bg-neutral-800/50 dark:bg-neutral-800 rounded-2xl p-3 w-full border border-border">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full min-h-[60px] resize-y bg-transparent text-sm border-0 focus-visible:ring-1 focus-visible:ring-ring p-2 rounded-lg text-neutral-100 placeholder:text-neutral-400"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleEditSave()
                                } else if (e.key === 'Escape') {
                                    handleEditCancel()
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={handleEditCancel} className="h-7 text-xs px-2 text-neutral-300 hover:text-white hover:bg-neutral-700">
                                <X size={12} className="mr-1" /> Cancel
                            </Button>
                            <Button variant="default" size="sm" onClick={handleEditSave} disabled={!editContent.trim()} className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white">
                                <Check size={12} className="mr-1" /> Save & Send
                            </Button>
                        </div>
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