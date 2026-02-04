import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Send, Paperclip, X, FileText, Image } from 'lucide-react'
import type { Message, MessageAttachment } from '@/types'

interface ChatInputProps {
    disabled?: boolean
    className?: string
}

// Mock response generator with charts
function generateMockResponse(userMessage: string, hasFiles: boolean): Omit<Message, 'id' | 'timestamp'> {
    const lowerMsg = userMessage.toLowerCase()

    // Tax-related questions - includes chart
    if (lowerMsg.includes('tax') || lowerMsg.includes('income')) {
        return {
            role: 'assistant',
            content: '',
            responseMode: 'explained',
            sections: [
                {
                    id: '1',
                    title: 'Analyzing income and tax data',
                    icon: 'calculator',
                    contents: [
                        { type: 'text', content: 'I\'ve analyzed your income sources and calculated your tax liability based on Nigerian PAYE tax brackets.' },
                    ],
                },
                {
                    id: '2',
                    title: 'Income breakdown',
                    icon: 'wallet',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'Salary Income': '₦1,850,000',
                                'Other Income': '₦600,000',
                                'Total Gross Income': '₦2,450,000',
                            }
                        },
                    ],
                },
                {
                    id: '3',
                    title: 'Tax calculation',
                    icon: 'receipt',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'Taxable Income': '₦2,405,000',
                                'Tax Rate': '21%',
                                'Monthly Tax': '₦42,088',
                                'Annual Tax': '₦505,050',
                            }
                        },
                    ],
                },
            ],
            charts: [
                {
                    id: 'monthly-income',
                    type: 'bar',
                    title: 'Monthly Income (2024)',
                    description: 'Income distribution across the year',
                    dateRange: 'Jan - Dec 2024',
                    data: [
                        { label: 'Jan', value: 180000 },
                        { label: 'Feb', value: 195000 },
                        { label: 'Mar', value: 210000 },
                        { label: 'Apr', value: 185000 },
                        { label: 'May', value: 220000 },
                        { label: 'Jun', value: 240000 },
                        { label: 'Jul', value: 225000 },
                        { label: 'Aug', value: 250000 },
                        { label: 'Sep', value: 235000 },
                        { label: 'Oct', value: 260000 },
                        { label: 'Nov', value: 245000 },
                        { label: 'Dec', value: 305000 },
                    ],
                },
            ],
            sources: [
                { id: '1', title: 'GTBank Statement', type: 'document' },
                { id: '2', title: 'FIRS Tax Tables', type: 'external' },
            ],
            stats: {
                sources: 2,
                words: 156,
                timeSaved: '2h 15min',
                cost: 10.26,
            },
        }
    }

    // Bank charges - includes line chart
    if (lowerMsg.includes('bank') || lowerMsg.includes('charge')) {
        return {
            role: 'assistant',
            content: '',
            responseMode: 'explained',
            sections: [
                {
                    id: '1',
                    title: 'Analyzing bank fees',
                    icon: 'trending-up',
                    contents: [
                        { type: 'text', content: 'I found recurring bank charges in your transaction history.' },
                    ],
                },
                {
                    id: '2',
                    title: 'Bank charges breakdown',
                    icon: 'dollar-sign',
                    contents: [
                        {
                            type: 'key-value', content: {
                                'SMS Alerts': '₦4,800',
                                'Transfer Fees': '₦12,350',
                                'ATM Fees': '₦2,100',
                                'Card Fees': '₦1,200',
                                'Total Charges': '₦20,450',
                            }
                        },
                    ],
                },
            ],
            charts: [
                {
                    id: 'bank-charges-trend',
                    type: 'line',
                    title: 'Bank Charges Trend',
                    description: 'Monthly bank fees over the past year',
                    dateRange: '2024',
                    data: [
                        { label: 'Jan', value: 1500 },
                        { label: 'Feb', value: 1650 },
                        { label: 'Mar', value: 1800 },
                        { label: 'Apr', value: 1700 },
                        { label: 'May', value: 1850 },
                        { label: 'Jun', value: 1600 },
                        { label: 'Jul', value: 1750 },
                        { label: 'Aug', value: 1900 },
                        { label: 'Sep', value: 1650 },
                        { label: 'Oct', value: 1800 },
                        { label: 'Nov', value: 1700 },
                        { label: 'Dec', value: 1950 },
                    ],
                },
            ],
            sources: [
                { id: '1', title: 'Transaction History', type: 'document' },
            ],
            stats: {
                sources: 1,
                words: 89,
                timeSaved: '45min',
                cost: 5.12,
            },
        }
    }

    // Default response
    return {
        role: 'assistant',
        content: '',
        responseMode: 'explained',
        sections: [
            {
                id: '1',
                title: 'Processing request',
                icon: 'file-text',
                contents: [
                    { type: 'text', content: 'I\'ve analyzed your financial documents.' },
                ],
            },
            {
                id: '2',
                title: 'Summary',
                icon: 'trending-up',
                contents: [
                    {
                        type: 'key-value', content: {
                            'Total Income': '₦2,450,000',
                            'Total Expenses': '₦1,890,000',
                            'Net Balance': '₦560,000',
                        }
                    },
                ],
            },
        ],
        stats: {
            sources: 1,
            words: 52,
            timeSaved: '30min',
            cost: 2.50,
        },
    }
}

export function ChatInput({ disabled, className }: ChatInputProps) {
    const [input, setInput] = useState('')
    const [attachedFiles, setAttachedFiles] = useState<File[]>([])
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { addMessage, activeChat, createChat, setThinking } = useChatStore()

    const handleSubmit = useCallback(() => {
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
    }, [input, attachedFiles, activeChat, addMessage, createChat, setThinking])

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
                                <span>Bank Statement (PDF/CSV)</span>
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
                    className="flex-1 min-h-[36px] max-h-[160px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 py-2 text-[13px]"
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
