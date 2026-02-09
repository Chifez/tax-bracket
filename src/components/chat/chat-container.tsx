import { useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useChatData, useChatSession } from '@/hooks/use-chat'
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
}

export function ChatContainer({ className }: ChatContainerProps) {
    const { activeChat, isThinking } = useChatStore()

    const { data: chatData, isLoading: isInitialLoading, refetch } = useChatData(activeChat)

    // Convert your Message type to UIMessage if needed
    const initialMessages = (chatData?.chat?.messages ?? []) as any

    const {
        messages,
        sendMessage,
        isLoading,
        status,
        stop,
        setMessages
    } = useChatSession(activeChat, initialMessages)

    // Refetch when activeChat changes
    useEffect(() => {
        if (activeChat) {
            const timer = setTimeout(() => {
                refetch()
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [activeChat, refetch])

    // Sync messages from DB to local state
    useEffect(() => {
        if (chatData?.chat?.messages && chatData.chat.messages.length > 0) {
            // Convert DB messages to UIMessage format
            const dbMessages = chatData.chat.messages.map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                parts: [{ type: 'text' as const, text: msg.content }],
                createdAt: msg.createdAt,
                // Preserve any other properties for legacy messages
                ...msg
            })) as UIMessage[]

            setMessages(dbMessages)
        }
    }, [chatData, setMessages])

    const bottomRef = useRef<HTMLDivElement>(null)

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
            <ScrollArea className="flex-1 px-4 py-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {!hasMessages && !isInitialLoading && !isThinking ? (
                        <EmptyState onSend={(message) => sendMessage({ text: message })} />
                    ) : (
                        <>
                            {messages.map((message: any) =>
                                message.role === 'user' ? (
                                    <MessageBubble key={message.id} message={message} />
                                ) : (
                                    <DocumentResponse key={message.id} message={message} />
                                )
                            )}

                            {/* Show thinking animation when:
                                1. isThinking (from store) is true AND no assistant message is streaming yet
                                2. isThinking is stable across hook re-instantiations
                            */}
                            {isThinking && (
                                messages.length === 0 || 
                                messages[messages.length - 1]?.role === 'user' ||
                                (messages[messages.length - 1]?.role === 'assistant' &&
                                    !(messages[messages.length - 1] as any).toolInvocations?.length
                                )
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
                        isLoading={isLoading}
                        isThinking={isThinking}
                        status={status}
                        disabled={!activeChat && messages.length > 0}
                    />
                </div>
            </div>
        </div>
    )
}