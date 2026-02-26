import { useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useChatSession, useChatData, useEditMessage } from '@/hooks/use-chat'
import { useFileUpload } from '@/hooks/use-uploads'
import { ScrollArea } from '@/components/ui'
import { ChatInput } from './chat-input'
import { DocumentResponse } from './document-response'
import { EmptyState } from './empty-state'
import { MessageBubble } from './message-bubble'
import { ThinkingAnimation } from './thinking-animation'
import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'

interface ChatContainerProps {
    className?: string
    chatId: string | null
    initialMessages?: UIMessage[]
}

export function ChatContainer({ className, chatId, initialMessages = [] }: ChatContainerProps) {
    const { isThinking } = useChatStore()
    const { data: chatData } = useChatData(chatId)
    const { uploadFile } = useFileUpload()

    const {
        messages,
        sendMessage,
        isLoading,
        status,
        stop,
        setMessages,
        regenerate
    } = useChatSession(chatId, initialMessages)

    const { mutateAsync: editMessage } = useEditMessage()

    const bottomRef = useRef<HTMLDivElement>(null)
    const lastSyncedMessageCountRef = useRef(0)
    const previousChatIdRef = useRef<string | null>(null)

    if (previousChatIdRef.current !== chatId) {
        previousChatIdRef.current = chatId
        lastSyncedMessageCountRef.current = 0
    }

    useEffect(() => {
        if (!chatId || !chatData?.chat?.messages) return
        if (status !== 'ready') return

        const dbMessages = chatData.chat.messages
        const dbMessageCount = dbMessages.length

        if (dbMessageCount > lastSyncedMessageCountRef.current) {
            const transformedMessages: UIMessage[] = dbMessages.map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                parts: [{ type: 'text' as const, text: msg.content }],
                createdAt: msg.createdAt,
                ...msg
            }))
            setMessages(transformedMessages)
            lastSyncedMessageCountRef.current = dbMessageCount
        }
    }, [chatData, chatId, status, setMessages])

    useEffect(() => {
        if (messages.length > 0 || isLoading) {
            setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', })
            }, 100)
        }
    }, [messages, isLoading])

    const hasMessages = messages.length > 0

    const handleSendMessage = async (text: string, fileIds?: string[]) => {
        // fileIds are already uploaded — resolved before Send was clicked
        sendMessage(
            { text },
            { body: { fileIds: fileIds ?? [] } }
        )
    }

    const handleEditMessage = async (messageId: string, newContent: string) => {
        if (!chatId) return

        // Update backend
        await editMessage({ chatId, messageId, newContent })

        // Truncate locally
        const targetIndex = messages.findIndex((m: any) => m.id === messageId)
        if (targetIndex === -1) return

        const truncated = [...messages.slice(0, targetIndex + 1)]
        const targetMessage = truncated[targetIndex]

        truncated[targetIndex] = {
            ...targetMessage,
            content: newContent,
            parts: [{ type: 'text', text: newContent }]
        } as UIMessage

        setMessages(truncated)

        // Resend
        setTimeout(() => {
            regenerate()
        }, 100)
    }

    return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
            <ScrollArea className="flex-1 px-4 py-4 max-sm:pt-14">
                <div className="max-w-2xl mx-auto space-y-4">
                    {!hasMessages && !isThinking ? (
                        <EmptyState onSend={(message) => sendMessage({ text: message })} />
                    ) : (
                        <>
                            {messages.map((message: any) =>
                                message.role === 'user' ? (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        onEdit={(newContent) => handleEditMessage(message.id, newContent)}
                                        isProcessing={isLoading}
                                    />
                                ) : (
                                    <DocumentResponse
                                        key={message.id}
                                        message={message}
                                        isStreaming={status === 'streaming' && message.id === messages[messages.length - 1]?.id}
                                    />
                                )
                            )}

                            {isThinking && (
                                messages.length === 0 ||
                                messages[messages.length - 1]?.role === 'user'
                            ) && (
                                    <ThinkingAnimation />
                                )}

                            <div ref={bottomRef} className="min-h-20" />
                        </>
                    )}
                </div>
            </ScrollArea>

            <div className="border-t border-border bg-background">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <ChatInput
                        onSend={handleSendMessage}
                        onStop={stop}
                        isThinking={isThinking}
                        status={status}
                        disabled={!chatId && messages.length > 0}
                        uploadFile={(file) => uploadFile(file, { chatId: chatId ?? undefined }) as any}
                    />
                </div>
            </div>
        </div>
    )
}