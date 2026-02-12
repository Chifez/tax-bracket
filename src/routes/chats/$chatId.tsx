import { createFileRoute } from '@tanstack/react-router'
import { getChat } from '@/server/functions/chat'
import { ChatContainer } from '@/components/chat'
import { useChatStore } from '@/stores/chat-store'
import { useEffect } from 'react'

export const Route = createFileRoute('/chats/$chatId')({
    component: ChatRoute,
    loader: async ({ params }) => {
        const { chat } = await getChat({ data: { chatId: params.chatId } })
        return { chat }
    },
    head: ({ loaderData }) => {
        const title = loaderData?.chat?.title || 'New Chat'
        const chat = loaderData?.chat

        return {
            meta: [
                { title: `${title} | TaxBracket` },
                { name: 'description', content: `Chat history: ${title}` },
                // Open Graph
                { property: 'og:title', content: `${title} | TaxBracket` },
                { property: 'og:description', content: `Smart tax analysis: ${title}` },
                // Twitter
                { name: 'twitter:title', content: `${title} | TaxBracket` },
                { name: 'twitter:description', content: `Smart tax analysis: ${title}` },
            ],
            scripts: [
                {
                    type: 'application/ld+json',
                    children: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: title,
                        datePublished: chat?.createdAt,
                        dateModified: chat?.updatedAt,
                        author: {
                            '@type': 'Organization',
                            name: 'TaxBracket AI',
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'TaxBracket',
                            logo: {
                                '@type': 'ImageObject',
                                url: 'https://taxbracket.ng/logo.png'
                            }
                        }
                    }),
                },
            ],
        }
    }
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
