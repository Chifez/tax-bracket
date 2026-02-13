import { useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useChatSession, useChatData } from '@/hooks/use-chat'
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

    // Fetch latest messages from DB (for syncing after streaming completes)
    const { data: chatData, isLoading: isChatLoading } = useChatData(chatId)

    const {
        messages,
        sendMessage,
        isLoading,
        status,
        stop,
        setMessages
    } = useChatSession(chatId, initialMessages)

    const bottomRef = useRef<HTMLDivElement>(null)
    const lastSyncedMessageCountRef = useRef(0)
    const previousChatIdRef = useRef<string | null>(null)

    // Reset sync counter when chatId changes
    if (previousChatIdRef.current !== chatId) {
        previousChatIdRef.current = chatId
        lastSyncedMessageCountRef.current = 0
    }

    // Sync DB messages to local state when:
    // - Not currently streaming (status === 'ready')
    // - DB has messages we don't have locally (after onFinish invalidates)
    // This ensures streamed messages are replaced with DB versions (which have proper metadata)
    useEffect(() => {
        if (!chatId || !chatData?.chat?.messages) return
        if (status !== 'ready') return // Don't sync during streaming

        const dbMessages = chatData.chat.messages
        const dbMessageCount = dbMessages.length

        // Only sync if DB has more messages than we've synced before
        // This prevents overwriting optimistic messages during navigation
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

    // Auto-scroll on new messages
    useEffect(() => {
        if (messages.length > 0 || isLoading) {
            setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        }
    }, [messages, isLoading])

    const hasMessages = messages.length > 0

    const handleSendMessage = (text: string, files?: File[]) => {
        if (files && files.length > 0) {
            sendMessage({
                text,
                files: files as any
            })
        } else {
            sendMessage({ text })
        }
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
                                    <MessageBubble key={message.id} message={message} />
                                ) : (
                                    <DocumentResponse 
                                        key={message.id} 
                                        message={message}
                                        isStreaming={status === 'streaming' && message.id === messages[messages.length - 1]?.id}
                                    />
                                )
                            )}


                            {/* Show ThinkingAnimation only when:
                                - isThinking is true (waiting for response)
                                - AND no streaming has started yet (last message is user or no messages)
                                Once streaming starts, isThinking is cleared by useChatSession
                            */}
                            {isThinking && (
                                messages.length === 0 ||
                                messages[messages.length - 1]?.role === 'user'
                            ) && (
                                <ThinkingAnimation />
                            )}

                            <div ref={bottomRef} />
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
                    />
                </div>
            </div>
        </div>
    )
}