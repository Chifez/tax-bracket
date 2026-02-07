import { useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useChat } from '@/hooks/use-chat'
import { ScrollArea } from '@/components/ui'
import { ChatInput } from './chat-input'
import { DocumentResponse } from './document-response'
import { EmptyState } from './empty-state'
import { MessageBubble } from './message-bubble'
import { ThinkingAnimation } from './thinking-animation'
import { cn } from '@/lib/utils'
import { Chat, Message } from '@/types'

interface ChatContainerProps {
    className?: string
}

export function ChatContainer({ className }: ChatContainerProps) {
    const { activeChat, isThinking } = useChatStore()
    const { data: chatData } = useChat(activeChat)
    const messages = chatData?.chat?.messages ?? []
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
                            {messages.map((message: Message) => (
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
