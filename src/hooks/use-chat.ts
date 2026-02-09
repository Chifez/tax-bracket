import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChats, getChat, deleteChat, editMessage } from '@/server/functions/chat'
import { useRouter } from '@tanstack/react-router'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai' // Import from 'ai' package
import type { UIMessage } from 'ai'
import { useState } from 'react'

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
    const queryClient = useQueryClient()
    const { setThinking, setActiveChat } = useChatStore()
    const [newChatId, setNewChatId] = useState<string | null>(null)

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
            async fetch(url, options) {

                const response = await fetch(url, options)

                const returnedChatId = response.headers.get('x-chat-id')
                const isNewChat = response.headers.get('x-is-new-chat') === 'true'

                if (isNewChat && returnedChatId && returnedChatId !== chatId) {
                    // Store the new chat ID
                    setNewChatId(returnedChatId)
                    // Update URL
                    window.history.replaceState({}, '', `/chats/${returnedChatId}`)
                }

                return response
            }
        }),
        onFinish: async (_options) => {
            const currentChatId = newChatId || chatId

            // Invalidate queries with the correct chat ID
            await queryClient.invalidateQueries({ queryKey: ['chats'] })
            if (currentChatId) {
                await queryClient.invalidateQueries({ queryKey: ['chat', currentChatId] })
                // Update active chat in store only after stream finishes to prevent re-mount
                setActiveChat(currentChatId)
            }

            // Delay setting thinking to false to allow for UI to catch up with the new message
            setTimeout(() => {
                setThinking(false)
            }, 500)
        },
        onError: (error) => {
            setThinking(false)
            toast.error("Error: " + error.message)
        }
    })

    const isLoading = status === 'streaming' || status === 'submitted'

    // We don't want to auto-sync thinking state here because it might flicker
    // Logic:
    // 1. onSubmit -> thinking = true (handled by store or component)
    // 2. onFinish -> thinking = false (handled above)
    // 3. New chat redirect -> thinking might need to stay true

    // Actually, let's keep it simple: useChat 'isLoading' is the source of truth for the *network* request.
    // Our store's 'isThinking' is for the *UI* state.

    // For now, let's trust the onFinish handler and the initial state.
    // If we remove this useEffect, we must ensure setThinking(true) is called when sending.
    // But useChat doesn't give us an onStart.
    // The ChatInput calls sendMessage, which is where we should setThinking(true).

    // Let's modify usage in chat-container via the input, or just rely on this effect but make it safer?
    // User complaint: "goes away 2-3 sec before".
    // This effect turns it off immediately when isLoading becomes false.
    // So removing this effect and controlling it manually is better.

    // However, if we remove it, we need to ensure it's set to true.
    // ChatInput calls sendMessage. 
    // Let's just comment this out or remove it and rely on the UI checking 'isLoading' directly for the animation,
    // and only use 'isThinking' for the global state if needed.
    // In ChatContainer, I updated it to check `isLoading` OR empty assistant message.
    // So the store `isThinking` might be redundant or causing conflicts.

    // Let's remove this sync effect.

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