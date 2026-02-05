import { useRef, useEffect } from 'react'
import { useMessages, useChatStore } from '@/stores/chat-store'
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
    const messages = useMessages()
    const { activeChat, isThinking } = useChatStore()
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    const hasMessages = messages.length > 0

    return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
            <ScrollArea
                ref={scrollRef}
                className="flex-1 px-4 py-4"
            >
                <div className="max-w-2xl mx-auto space-y-4">
                    {!hasMessages ? (
                        <EmptyState />
                    ) : (
                        <>
                            {messages.map((message) => (
                                message.role === 'user' ? (
                                    <MessageBubble key={message.id} message={message} />
                                ) : (
                                    <DocumentResponse key={message.id} message={message} />
                                )
                            ))}
                            {isThinking && <ThinkingAnimation />}
                        </>
                    )}
                </div>
            </ScrollArea>

            <div className="border-t border-border bg-background">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <ChatInput disabled={!activeChat && messages.length > 0} />
                </div>
            </div>
        </div>
    )
}
