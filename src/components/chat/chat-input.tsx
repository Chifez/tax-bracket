import { useState, useRef, KeyboardEvent } from 'react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Send, Paperclip, X, FileText, Image, Square, Loader2, CheckCircle2 } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface AttachedFile {
    localId: string         // temp local ID for tracking
    name: string
    status: 'uploading' | 'done' | 'error'
    fileId: string | null   // DB UUID returned after upload
}

interface ChatInputProps {
    disabled?: boolean
    className?: string
    onSend: (text: string, fileIds?: string[]) => void
    onStop: () => void
    isThinking: boolean
    status: 'submitted' | 'streaming' | 'ready' | 'error'
    uploadFile: (file: File) => Promise<{ file: { id: string } } | null>
}

export function ChatInput({
    disabled,
    className,
    onSend,
    onStop,
    isThinking,
    status,
    uploadFile,
}: ChatInputProps) {
    const [input, setInput] = useState('')
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data } = useUser()
    const user = data?.user

    const isProcessing = isThinking || status === 'streaming' || status === 'submitted'
    const isAnyUploading = attachedFiles.some(f => f.status === 'uploading')
    const canSend = (input.trim() || attachedFiles.some(f => f.status === 'done')) &&
        !isProcessing && !isAnyUploading && !disabled

    const handleSendClick = async () => {
        if (!user) {
            toast.error('You must be logged in to send messages')
            return
        }
        if (!canSend) return

        const readyFileIds = attachedFiles
            .filter(f => f.status === 'done' && f.fileId)
            .map(f => f.fileId!)

        onSend(input, readyFileIds.length > 0 ? readyFileIds : undefined)
        setInput('')
        setAttachedFiles([])
    }

    const onEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && canSend) {
            e.preventDefault()
            handleSendClick()
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return
        setShowAttachMenu(false)

        // Reset file input so the same file can be picked again
        e.target.value = ''

        // Register each file immediately with 'uploading' status
        const newEntries: AttachedFile[] = files.map(file => ({
            localId: crypto.randomUUID(),
            name: file.name,
            status: 'uploading',
            fileId: null,
        }))

        setAttachedFiles(prev => [...prev, ...newEntries])

        // Upload each file in parallel
        await Promise.all(
            files.map(async (file, idx) => {
                const localId = newEntries[idx].localId
                try {
                    const result = await uploadFile(file)
                    const uploadedId = result?.file?.id ?? null
                    setAttachedFiles(prev =>
                        prev.map(f =>
                            f.localId === localId
                                ? { ...f, status: uploadedId ? 'done' : 'error', fileId: uploadedId }
                                : f
                        )
                    )
                    if (!uploadedId) toast.error(`Failed to upload ${file.name}`)
                } catch {
                    setAttachedFiles(prev =>
                        prev.map(f =>
                            f.localId === localId ? { ...f, status: 'error' } : f
                        )
                    )
                    toast.error(`Failed to upload ${file.name}`)
                }
            })
        )
    }

    const removeFile = (localId: string) => {
        setAttachedFiles(prev => prev.filter(f => f.localId !== localId))
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
                    {attachedFiles.map(file => (
                        <div
                            key={file.localId}
                            className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs',
                                file.status === 'uploading' && 'bg-muted text-muted-foreground',
                                file.status === 'done' && 'bg-muted text-foreground',
                                file.status === 'error' && 'bg-destructive/10 text-destructive',
                            )}
                        >
                            {file.status === 'uploading' ? (
                                <Loader2 size={12} className="animate-spin shrink-0" />
                            ) : file.status === 'done' ? (
                                <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                            ) : (
                                <FileText size={12} className="shrink-0" />
                            )}
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            {file.status !== 'uploading' && (
                                <button
                                    onClick={() => removeFile(file.localId)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X size={12} />
                                </button>
                            )}
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
                    placeholder={
                        isAnyUploading
                            ? 'Uploading file...'
                            : disabled
                                ? 'Start a new chat...'
                                : 'Ask a question...'
                    }
                    disabled={disabled || isProcessing}
                    className="flex-1 min-h-[36px] max-h-[160px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-2 text-base md:text-[13px]"
                    rows={1}
                />

                {/* Send/Stop Button */}
                {isProcessing ? (
                    <Button
                        type="button"
                        size="icon"
                        onClick={onStop}
                        className="h-8 w-8 shrink-0 rounded-lg bg-red-500 hover:bg-red-600"
                    >
                        <Square size={14} />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        size="icon"
                        onClick={handleSendClick}
                        disabled={!canSend}
                        className="h-8 w-8 shrink-0 rounded-lg"
                    >
                        {isAnyUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </Button>
                )}
            </div>
        </div>
    )
}