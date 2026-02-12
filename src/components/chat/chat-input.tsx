import { useState, useRef, KeyboardEvent } from 'react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Send, Paperclip, X, FileText, Image, Square } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface ChatInputProps {
    disabled?: boolean
    className?: string
    onSend: (text: string, files?: File[]) => void
    onStop: () => void
    isThinking: boolean // From Zustand store - stable across hook re-instantiations
    status: 'submitted' | 'streaming' | 'ready' | 'error'
}

export function ChatInput({
    disabled,
    className,
    onSend,
    onStop,
    isThinking,
    status
}: ChatInputProps) {
    const [input, setInput] = useState('')
    const [attachedFiles, setAttachedFiles] = useState<File[]>([])
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data } = useUser()
    const user = data?.user

    // Use isThinking (from store) OR status for robustness
    // isThinking is stable even when useChat hook re-instantiates
    const isProcessing = isThinking || status === 'streaming' || status === 'submitted'

    const handleSendClick = async () => {
        if (!user) {
            toast.error("You must be logged in to send messages")
            return
        }

        if (!input.trim() && attachedFiles.length === 0) return

        onSend(input, attachedFiles.length > 0 ? attachedFiles : undefined)
        setInput('')
        setAttachedFiles([])
    }

    const handleStopClick = () => {
        onStop()
    }

    const onEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
            e.preventDefault()
            handleSendClick()
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                        disabled={disabled || isProcessing}
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
                    onChange={handleFileChange}
                    multiple
                />

                {/* Text Input */}
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder={disabled ? 'Start a new chat...' : 'Ask a question...'}
                    disabled={disabled || isProcessing}
                    className="flex-1 min-h-[36px] max-h-[160px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-2 text-base md:text-[13px]"
                    rows={1}
                />

                {/* Send/Stop Button */}
                {isProcessing ? (
                    <Button
                        type="button"
                        size="icon"
                        onClick={handleStopClick}
                        className="h-8 w-8 shrink-0 rounded-lg bg-red-500 hover:bg-red-600"
                    >
                        <Square size={14} />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        size="icon"
                        onClick={handleSendClick}
                        disabled={(!input.trim() && attachedFiles.length === 0) || disabled}
                        className="h-8 w-8 shrink-0 rounded-lg"
                    >
                        <Send size={14} />
                    </Button>
                )}
            </div>
        </div>
    )
}