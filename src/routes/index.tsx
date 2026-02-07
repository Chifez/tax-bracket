import { createFileRoute } from '@tanstack/react-router'
import { ChatContainer } from '@/components/chat'

export const Route = createFileRoute('/')({
  component: HomePage
})

import { useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'

function HomePage() {
  const setActiveChat = useChatStore(state => state.setActiveChat)

  useEffect(() => {
    setActiveChat(null)
  }, [setActiveChat])

  return <ChatContainer />
}
