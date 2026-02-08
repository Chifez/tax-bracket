import { useRef, useEffect, useState } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useChatData, useChatSession } from '@/hooks/use-chat'
import { ScrollArea } from '@/components/ui'
import { ChatInput } from './chat-input'
import { DocumentResponse } from './document-response'
import { EmptyState } from './empty-state'
import { MessageBubble } from './message-bubble'
import { ThinkingAnimation } from './thinking-animation'
import { cn } from '@/lib/utils'

interface ChatContainerProps {
    className?: string
}

export function ChatContainer({ className }: ChatContainerProps) {
    const { activeChat } = useChatStore()

    const { data: chatData, isLoading: isInitialLoading } = useChatData(activeChat)

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

    const bottomRef = useRef<HTMLDivElement>(null)

    // Auto-scroll on new messages
    useEffect(() => {
        if (messages.length > 0 || isLoading) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
                    {!hasMessages && !isInitialLoading ? (
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

                            {isLoading && messages[messages.length - 1]?.role === 'user' && (
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
                        status={status}
                        disabled={!activeChat && messages.length > 0}
                    />
                </div>
            </div>
        </div>
    )
}