import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { generateMockResponse } from '@/lib/mock-data'
import { Send, Paperclip, X, FileText, Image } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { MessageAttachment } from '@/types'

interface ChatInputProps {
    disabled?: boolean
    className?: string
}

export function ChatInput({ disabled, className }: ChatInputProps) {
    const [input, setInput] = useState('')
    const [attachedFiles, setAttachedFiles] = useState<File[]>([])
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { addMessage, activeChat, createChat, setThinking } = useChatStore()

    const { data } = useUser()
    const user = data?.user

    const handleSubmit = useCallback(() => {
        if (!user) {
            toast.error("You must be logged in to send messages")
            return
        }

        const trimmedInput = input.trim()
        if (!trimmedInput && attachedFiles.length === 0) return

        // Create chat if none exists
        let chatId = activeChat
        if (!chatId) {
            chatId = createChat()
        }

        // Create attachments from files
        const attachments: MessageAttachment[] = attachedFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
        }))

        // Add user message
        addMessage(chatId, {
            role: 'user',
            content: trimmedInput,
            attachments: attachments.length > 0 ? attachments : undefined,
        })

        // Clear input
        const hasFiles = attachedFiles.length > 0
        setInput('')
        setAttachedFiles([])

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }

        // Show thinking state
        setThinking(true)

        // Generate mock response after delay (longer if files attached)
        const delay = hasFiles ? 2500 : 1200
        setTimeout(() => {
            setThinking(false)
            const mockResponse = generateMockResponse(trimmedInput, hasFiles)
            addMessage(chatId!, mockResponse)
        }, delay)
    }, [input, attachedFiles, activeChat, addMessage, createChat, setThinking, user])

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        setAttachedFiles((prev) => [...prev, ...files])
        setShowAttachMenu(false)
    }

    const removeFile = (index: number) => {
        setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const openFileDialog = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept
            fileInputRef.current.click()
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
        }
    }

    const canSubmit = (input.trim() || attachedFiles.length > 0) && !disabled

    return (
        <div className={cn('space-y-2', className)}>
            {/* Attached Files */}
            {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs"
                        >
                            <FileText size={12} className="text-muted-foreground" />
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <button
                                onClick={() => removeFile(index)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="relative flex items-end gap-2 bg-muted/40 rounded-xl border border-border p-1.5">
                {/* Attach Button */}
                <div className="relative">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-lg"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        disabled={disabled}
                    >
                        <Paperclip size={16} />
                    </Button>

                    {showAttachMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-popover border rounded-lg shadow-lg p-1 min-w-[180px] z-10">
                            <button
                                onClick={() => openFileDialog('.pdf,.csv')}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted rounded-md"
                            >
                                <FileText size={14} />
                                <span>File (PDF/CSV)</span>
                            </button>
                            <button
                                onClick={() => openFileDialog('image/*')}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted rounded-md"
                            >
                                <Image size={14} />
                                <span>Image</span>
                            </button>
                        </div>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    multiple
                />

                {/* Text Input */}
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? 'Start a new chat...' : 'Ask a question...'}
                    disabled={disabled}
                    className="flex-1 min-h-[36px] max-h-[160px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-2 text-base md:text-[13px]"
                    rows={1}
                />

                {/* Send Button */}
                <Button
                    type="button"
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="h-8 w-8 shrink-0 rounded-lg"
                >
                    <Send size={14} />
                </Button>
            </div>
        </div>
    )
}
