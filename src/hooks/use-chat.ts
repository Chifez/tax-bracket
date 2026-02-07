import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChats, getChat, createChat, sendMessage, deleteChat } from '@/server/functions/chat'
import { useRouter } from '@tanstack/react-router'
import { useChatStore } from '@/stores/chat-store'

export const useChats = () => {
    return useQuery({
        queryKey: ['chats'],
        queryFn: () => getChats(),
    })
}

export const useChat = (chatId: string | null) => {
    return useQuery({
        queryKey: ['chat', chatId],
        queryFn: () => getChat({ data: { chatId: chatId! } }),
        enabled: !!chatId,
    })
}

export const useCreateChat = () => {
    const queryClient = useQueryClient()
    const { setActiveChat } = useChatStore()
    const router = useRouter()

    return useMutation({
        mutationFn: async ({ message, attachments }: { message?: string, attachments?: any[] }) => {
            useChatStore.getState().setThinking(true)
            try {
                return await createChat({ data: { message, attachments } })
            } catch (error) {
                useChatStore.getState().setThinking(false)
                throw error
            }
        },
        onSuccess: (data) => {
            useChatStore.getState().setThinking(false)
            queryClient.invalidateQueries({ queryKey: ['chats'] })
            setActiveChat(data.chat.id)
            router.navigate({ to: '/chats/$chatId', params: { chatId: data.chat.id } })
        },
        onError: () => {
            useChatStore.getState().setThinking(false)
        }
    })
}

export const useSendMessage = () => {
    const queryClient = useQueryClient()
    const { setThinking } = useChatStore()

    return useMutation({
        mutationFn: async ({ chatId, content, role, attachments }: { chatId: string, content: string, role: 'user' | 'assistant' | 'system', attachments?: any[] }) => {
            setThinking(true)
            try {
                return await sendMessage({ data: { chatId, content, role, attachments } })
            } catch (error) {
                setThinking(false)
                throw error
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['chat', variables.chatId] })
            queryClient.invalidateQueries({ queryKey: ['chats'] })
            setThinking(false)
        },
        onError: () => {
            setThinking(false)
        },
    })
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
