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
        mutationFn: (message?: string) => createChat({ data: { message } }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['chats'] })
            setActiveChat(data.chat.id)
            router.navigate({ to: '/chats/$chatId', params: { chatId: data.chat.id } })
        },
    })
}

export const useSendMessage = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ chatId, content, role }: { chatId: string, content: string, role: 'user' | 'assistant' | 'system' }) =>
            sendMessage({ data: { chatId, content, role } }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['chat', variables.chatId] })
            queryClient.invalidateQueries({ queryKey: ['chats'] }) // Update last message snippet in sidebar
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
