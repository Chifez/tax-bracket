import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChats, getChat, deleteChat, editMessage } from '@/server/functions/chat'
import { useRouter } from '@tanstack/react-router'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai' // Import from 'ai' package
import type { UIMessage } from 'ai'
import { useEffect } from 'react'

export const useChats = () => {
    return useQuery({
        queryKey: ['chats'],
        queryFn: () => getChats(),
    })
}

export const useChatData = (chatId: string | null) => {
    return useQuery({
        queryKey: ['chat', chatId],
        queryFn: () => getChat({ data: { chatId: chatId! } }),
        enabled: !!chatId,
    })
}

export const useChatSession = (chatId: string | null, initialMessages: UIMessage[] = []) => {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { setThinking } = useChatStore()

    const {
        messages,
        sendMessage,
        status,
        setMessages,
        regenerate,
        stop
    } = useChat({
        id: chatId || undefined,
        messages: initialMessages,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: {
                chatId,
            },
            // Add custom fetch to intercept response headers
            async fetch(url, options) {
                const response = await fetch(url, options)

                // Only handle new chat creation (when we don't have a chatId yet)
                if (!chatId) {
                    const newChatId = response.headers.get('x-chat-id')
                    if (newChatId) {
                        // Update URL to new chat
                        window.history.replaceState({}, '', `/chats/${newChatId}`)
                        // Refresh sidebar to show new chat
                        queryClient.invalidateQueries({ queryKey: ['chats'] })
                    }
                }

                return response
            }
        }),
        onFinish: (options) => {
            // Always refresh the current chat data
            if (chatId) {
                queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
            }
            // Only invalidate chats list on first message (when creating new chat)
            // This is handled in the fetch interceptor above
            setThinking(false)
        },
        onError: (error) => {
            setThinking(false)
            toast.error("Error: " + error.message)
        }
    })

    const isLoading = status === 'streaming' || status === 'submitted'

    useEffect(() => {
        setThinking(isLoading)
    }, [isLoading, setThinking])

    return {
        messages,
        sendMessage,
        isLoading,
        status,
        setMessages,
        regenerate,
        stop
    }
}

export const useDeleteChat = () => {
    const queryClient = useQueryClient()
    const router = useRouter()

    return useMutation({
        mutationFn: (chatId: string) => deleteChat({ data: { chatId } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] })
            router.navigate({ to: '/' })
        },
    })
}

export const useEditMessage = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ chatId, messageId, newContent }: { chatId: string, messageId: string, newContent: string }) => {
            await editMessage({ data: { chatId, messageId, content: newContent } })
            return { success: true }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['chat', variables.chatId] })
        }
    })
}