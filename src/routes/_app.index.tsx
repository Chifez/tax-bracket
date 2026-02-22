import { createFileRoute } from '@tanstack/react-router'
import { ChatContainer } from '@/components/chat'

export const Route = createFileRoute('/_app/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'Dashboard | TaxBracket' },
      { name: 'description', content: 'Manage your taxes and get financial insights.' },
    ]
  })
})



function HomePage() {
  return <ChatContainer chatId={null} initialMessages={[]} />
}
