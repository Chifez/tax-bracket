import { useNavigate } from '@tanstack/react-router'
import { useCreateChat } from '@/hooks/use-chat'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '@/components/ui'
import { Logo } from '@/components/logo'
import {
    FileText,
    TrendingUp,
    Receipt,
    Calculator,
    ArrowRight,
    Upload,
} from 'lucide-react'
import type { Message } from '@/types'

const exampleQuestions = [
    {
        icon: TrendingUp,
        text: 'How much tax will I pay monthly?',
    },
    {
        icon: Receipt,
        text: 'How much did I pay in bank charges?',
    },
    {
        icon: Calculator,
        text: 'Generate my tax filing report',
    },
    {
        icon: FileText,
        text: 'Show income breakdown by month',
    },
]

export function EmptyState() {
    const { mutateAsync: createChat } = useCreateChat()
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const handleQuestionClick = async (question: string) => {
        try {
            const { chat } = await createChat(question)

            // Navigate to the new chat
            await navigate({ to: '/chats/$chatId', params: { chatId: chat.id } })

            // Trigger mock response
            setTimeout(() => {
                const mockResponse: Message = {
                    id: 'mock-response',
                    role: 'assistant',
                    content: '',
                    responseMode: 'explained',
                    timestamp: new Date().toISOString(),
                    sections: [
                        {
                            id: '1',
                            title: 'Getting started',
                            // icon: 'file-text', // Check if icon uses string or component, type says string?
                            contents: [
                                { type: 'text', content: 'Upload your bank statements to get detailed financial analysis. I support PDF and CSV formats from Nigerian banks.' },
                            ],
                        },
                    ],
                    stats: {
                        sources: 0,
                        words: 24,
                    },
                }

                queryClient.setQueryData(['chat', chat.id], (old: any) => {
                    if (!old?.chat) return old
                    return {
                        ...old,
                        chat: {
                            ...old.chat,
                            messages: [...old.chat.messages, mockResponse]
                        }
                    }
                })
            }, 800)
        } catch (error) {
            console.error("Failed to create chat", error)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            {/* Logo */}
            <div className="mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto">
                    <Logo className="text-xl" />
                </div>
                <h1 className="text-xl font-semibold text-foreground mb-1">
                    TaxBracket
                </h1>
                <p className="text-sm text-muted-foreground max-w-sm">
                    AI-powered financial analyst for bank statements and tax filings
                </p>
            </div>

            {/* Upload Card */}
            <Card className="w-full max-w-md p-5 mb-6 hover:border-primary/40 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Upload className="text-primary" size={18} />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-medium text-sm mb-0.5">Upload Bank Statements</h3>
                        <p className="text-xs text-muted-foreground">
                            PDF or CSV from any Nigerian bank
                        </p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
            </Card>

            {/* Example Questions */}
            <div className="w-full max-w-md">
                <p className="text-xs text-muted-foreground mb-2">Try asking</p>
                <div className="grid grid-cols-2 gap-2">
                    {exampleQuestions.map((q, index) => {
                        const Icon = q.icon
                        return (
                            <Button
                                key={index}
                                variant="outline"
                                className="justify-start gap-2 h-auto py-2.5 px-3 text-left text-xs"
                                onClick={() => handleQuestionClick(q.text)}
                            >
                                <Icon size={14} className="shrink-0 text-primary" />
                                <span className="flex-1 line-clamp-2">{q.text}</span>
                            </Button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
