import { createFileRoute } from '@tanstack/react-router'
import { ChatContainer } from '@/components/chat'
import { useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'Dashboard | TaxBracket' },
      { name: 'description', content: 'Manage your taxes and get financial insights.' },
    ]
  })
})



function HomePage() {
  const setActiveChat = useChatStore(state => state.setActiveChat)

  useEffect(() => {
    setActiveChat(null)
  }, [setActiveChat])

  return <ChatContainer />
}
