import { createFileRoute, useParams } from '@tanstack/react-router'
import { ChatContainer } from '@/components/chat'
import { useChatStore } from '@/stores/chat-store'
import { useEffect } from 'react'

export const Route = createFileRoute('/chats/$chatId')({
    component: ChatRoute
})

function ChatRoute() {
    const { chatId } = Route.useParams()
    const setActiveChat = useChatStore(state => state.setActiveChat)

    useEffect(() => {
        if (chatId) {
            setActiveChat(chatId)
        }
    }, [chatId, setActiveChat])

    return <ChatContainer />
}
