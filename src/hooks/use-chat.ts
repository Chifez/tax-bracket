import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChats, getChat, deleteChat, editMessage, renameChat } from '@/server/functions/chat'
import { useRouter, useNavigate } from '@tanstack/react-router'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useRef } from 'react'
import { generateId } from '@/lib/utils'

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
    const navigate = useNavigate()
    const { setThinking, setActiveChat } = useChatStore()
    const isThinking = useChatStore(state => state.isThinking)

    const pendingMessageRef = useRef<{ processed: boolean; data: any | null; forChatId: string | null }>({
        processed: false,
        data: null,
        forChatId: null
    })
    const hasSentPendingMessage = useRef(false)
    const previousChatIdRef = useRef<string | null>(null)

    if (previousChatIdRef.current !== chatId) {
        previousChatIdRef.current = chatId
        pendingMessageRef.current = { processed: false, data: null, forChatId: null }
        hasSentPendingMessage.current = false
    }

    if (!pendingMessageRef.current.processed && chatId && typeof window !== 'undefined') {
        const pendingData = sessionStorage.getItem('pendingMessage')
        if (pendingData) {
            try {
                const parsed = JSON.parse(pendingData)
                if (parsed.chatId === chatId) {
                    pendingMessageRef.current.data = parsed
                    pendingMessageRef.current.forChatId = chatId
                    sessionStorage.removeItem('pendingMessage')
                }
            } catch (e) {
                sessionStorage.removeItem('pendingMessage')
            }
        }
        pendingMessageRef.current.processed = true
    }

    const {
        messages,
        sendMessage: originalSendMessage,
        status,
        setMessages,
        regenerate,
        stop: originalStop
    } = useChat({
        id: chatId || 'new-chat',
        messages: initialMessages,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: { chatId }
        }),
        onFinish: async () => {
            await queryClient.invalidateQueries({ queryKey: ['chats'] })
            if (chatId) {
                await queryClient.refetchQueries({ queryKey: ['chat', chatId] })
            }
            setThinking(false)
        },
        onError: (error) => {
            setThinking(false)
            toast.error("Error: " + error.message)
        }
    })

    if (pendingMessageRef.current.data && !hasSentPendingMessage.current && status === 'ready') {
        hasSentPendingMessage.current = true
        const { chatId: _, ...messageOptions } = pendingMessageRef.current.data

        queueMicrotask(() => {
            setThinking(true)
            originalSendMessage(messageOptions)
        })
    }

    if (isThinking && status === 'streaming') {
        queueMicrotask(() => {
            setThinking(false)
        })
    }

    const sendMessage: typeof originalSendMessage = (options, requestOptions) => {
        if (!chatId) {
            const newChatId = generateId()
            const messageText = options && 'text' in options ? options.text : ''

            const optimisticMessage = {
                id: generateId(),
                role: 'user' as const,
                parts: [{ type: 'text' as const, text: messageText || '' }],
            }

            setMessages([optimisticMessage as UIMessage])

            if (typeof window !== 'undefined') {
                sessionStorage.setItem('pendingMessage', JSON.stringify({
                    chatId: newChatId,
                    ...options
                }))
            }

            setActiveChat(newChatId)
            navigate({
                to: '/chats/$chatId',
                params: { chatId: newChatId },
                replace: true
            })

            return Promise.resolve()
        }

        setThinking(true)
        return originalSendMessage(options, requestOptions)
    }

    const stop = () => {
        setThinking(false)
        return originalStop()
    }

    const isLoading = isThinking || status === 'streaming' || status === 'submitted'

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

export const useRenameChat = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ chatId, title }: { chatId: string, title: string }) => {
            await renameChat({ data: { chatId, title } })
            return { success: true }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] })
        }
    })
}