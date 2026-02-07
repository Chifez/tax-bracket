import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/chat/empty-state'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage() {
  return <EmptyState />
}
