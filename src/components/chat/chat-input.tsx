import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Send, Paperclip, X, FileText, Image, Square, Loader2, CheckCircle2 } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { deleteFile as deleteFileServer, getFileStatus } from '@/server/functions/upload'

interface AttachedFile {
    localId: string
    name: string
    status: 'uploading' | 'processing' | 'done' | 'error' | 'deleting'
    fileId: string | null
}

interface ChatInputProps {
    disabled?: boolean
    className?: string
    onSend: (text: string, fileIds?: string[]) => void
    onStop: () => void
    isThinking: boolean
    status: 'submitted' | 'streaming' | 'ready' | 'error'
    uploadFile: (file: File) => Promise<{ file: { id: string, status?: string } } | null>
}

const MAX_HEIGHT = 100

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
    const [queuedMessage, setQueuedMessage] = useState<{ text: string } | null>(null)
    const attachedFilesRef = useRef<AttachedFile[]>([])
    useEffect(() => {
        attachedFilesRef.current = attachedFiles
    }, [attachedFiles])
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data } = useUser()
    const user = data?.user

    const isProcessingBackend = isThinking || status === 'streaming' || status === 'submitted'
    // Block standard send ONLY if actively uploading to S3
    const isActivelyUploading = attachedFiles.some(f => f.status === 'uploading')
    const isActivelyProcessing = attachedFiles.some(f => f.status === 'processing') || queuedMessage !== null

    // We allow Send as long as we aren't uploading to S3 and aren't already generating a backend response
    const canSendState = (input.trim() || attachedFiles.some(f => f.status === 'done' || f.status === 'processing')) &&
        !isProcessingBackend && !isActivelyUploading && !disabled

    // Auto-expand textarea
    const adjustHeight = useCallback(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
        el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
    }, [])

    useEffect(() => {
        adjustHeight()
    }, [input, adjustHeight])

    // Effect for the Async Intent Queueing
    // Fires when files finish processing but there is a message waiting.
    useEffect(() => {
        if (!queuedMessage) return;

        // Check if all files are completely done processing
        const hasProcessing = attachedFiles.some(f => f.status === 'processing' || f.status === 'uploading');
        if (!hasProcessing) {
            const readyFileIds = attachedFiles
                .filter(f => f.status === 'done' && f.fileId)
                .map(f => f.fileId!);

            // Dispatch to parent components
            onSend(queuedMessage.text, readyFileIds.length > 0 ? readyFileIds : undefined);

            // Clear local queue
            setQueuedMessage(null);
            setAttachedFiles([]);
        }
    }, [attachedFiles, queuedMessage, onSend]);

    const handleSendClick = async () => {
        if (!user) {
            toast.error('You must be logged in to send messages')
            return
        }
        if (!canSendState) return

        // If files are still processing on the backend, queue the intent!
        const hasProcessing = attachedFiles.some(f => f.status === 'processing')
        if (hasProcessing) {
            setQueuedMessage({ text: input })
            setInput('')
            return
        }

        const readyFileIds = attachedFiles
            .filter(f => f.status === 'done' && f.fileId)
            .map(f => f.fileId!)

        onSend(input, readyFileIds.length > 0 ? readyFileIds : undefined)
        setInput('')
        setAttachedFiles([])

        // Reset textarea height after send
        requestAnimationFrame(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }
        })
    }

    const onEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && canSendState) {
            e.preventDefault()
            handleSendClick()
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return
        setShowAttachMenu(false)

        e.target.value = ''

        const newEntries: AttachedFile[] = files.map(file => ({
            localId: crypto.randomUUID(),
            name: file.name,
            status: 'uploading',
            fileId: null,
        }))

        setAttachedFiles(prev => [...prev, ...newEntries])

        await Promise.all(
            files.map(async (file, idx) => {
                const localId = newEntries[idx].localId
                try {
                    const result = await uploadFile(file)
                    const uploadedId = result?.file?.id ?? null
                    const fileStatus = result?.file?.status ?? 'pending'

                    const nextStatus = uploadedId ? (fileStatus === 'completed' ? 'done' : 'processing') : 'error'

                    setAttachedFiles(prev =>
                        prev.map(f =>
                            f.localId === localId
                                ? { ...f, status: nextStatus, fileId: uploadedId }
                                : f
                        )
                    )

                    if (uploadedId && nextStatus === 'processing') {
                        pollFileStatus(localId, uploadedId, file.name)
                    }

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

    const pollFileStatus = (localId: string, fileId: string, filename: string) => {
        const interval = setInterval(async () => {
            try {
                // Check if file was removed from UI; if so, abort polling
                if (!attachedFilesRef.current.some(f => f.localId === localId)) {
                    clearInterval(interval)
                    return
                }

                const res = await getFileStatus({ data: { fileId } })

                if (res.status === 'completed') {
                    setAttachedFiles(prev => prev.map(f => f.localId === localId ? { ...f, status: 'done' } : f))
                    clearInterval(interval)
                } else if (res.status === 'failed') {
                    setAttachedFiles(prev => prev.map(f => f.localId === localId ? { ...f, status: 'error' } : f))
                    toast.error(`Background processing failed for ${filename}`)
                    clearInterval(interval)
                }
            } catch (err) {
                console.error('[ChatInput] Polling error:', err)
            }
        }, 2000)
    }

    const removeFile = async (localId: string) => {
        const file = attachedFiles.find(f => f.localId === localId)
        if (!file) return

        // If the file was uploaded, delete it server-side
        if (file.fileId && file.status === 'done') {
            setAttachedFiles(prev =>
                prev.map(f => f.localId === localId ? { ...f, status: 'deleting' } : f)
            )
            try {
                await deleteFileServer({ data: { fileId: file.fileId } })
            } catch (err) {
                console.error('[ChatInput] Failed to delete file:', err)
            }
        }

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
                                file.status === 'deleting' && 'bg-muted text-muted-foreground opacity-50',
                                file.status === 'error' && 'bg-destructive/10 text-destructive',
                            )}
                        >
                            {file.status === 'uploading' || file.status === 'processing' || file.status === 'deleting' ? (
                                <Loader2 size={12} className="animate-spin shrink-0" />
                            ) : file.status === 'done' ? (
                                <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                            ) : (
                                <FileText size={12} className="shrink-0" />
                            )}
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            {file.status !== 'uploading' && file.status !== 'processing' && file.status !== 'deleting' && (
                                <button
                                    onClick={() => removeFile(file.localId)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
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
                        disabled={disabled || isProcessingBackend || queuedMessage !== null}
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
                        isActivelyUploading
                            ? 'Uploading file...'
                            : queuedMessage !== null
                                ? 'Analyzing document...'
                                : disabled
                                    ? 'Start a new chat...'
                                    : 'Ask a question...'
                    }
                    disabled={disabled || isProcessingBackend || queuedMessage !== null}
                    className="flex-1 min-h-[36px] border-0 bg-transparent resize-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 py-2 text-base md:text-[13px] placeholder:text-muted-foreground disabled:opacity-50"
                    rows={1}
                    style={{ overflowY: 'hidden' }}
                />

                {/* Send/Stop Button */}
                {isProcessingBackend ? (
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
                        disabled={!canSendState && queuedMessage === null}
                        className="h-8 w-8 shrink-0 rounded-lg"
                    >
                        {isActivelyUploading || queuedMessage !== null || isActivelyProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </Button>
                )}
            </div>
        </div>
    )
}