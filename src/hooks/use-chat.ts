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

    // Track pending message processing - read synchronously, no useEffect
    const pendingMessageRef = useRef<{ processed: boolean; data: any | null }>({
        processed: false,
        data: null
    })
    const hasSentPendingMessage = useRef(false)

    // Read pending message synchronously during render (once per chatId)
    if (!pendingMessageRef.current.processed && chatId) {
        const pendingData = sessionStorage.getItem('pendingMessage')
        if (pendingData) {
            try {
                const parsed = JSON.parse(pendingData)
                if (parsed.chatId === chatId) {
                    pendingMessageRef.current.data = parsed
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
            // Invalidate queries
            await queryClient.invalidateQueries({ queryKey: ['chats'] })
            if (chatId) {
                await queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
            }
            // Clear thinking state
            setThinking(false)
        },
        onError: (error) => {
            setThinking(false)
            toast.error("Error: " + error.message)
        }
    })

    // Process pending message after hook is ready (no useEffect - runs in render)
    if (pendingMessageRef.current.data && !hasSentPendingMessage.current && status === 'ready') {
        hasSentPendingMessage.current = true
        const { chatId: _, ...messageOptions } = pendingMessageRef.current.data

        // Schedule after current render completes
        queueMicrotask(() => {
            setThinking(true)
            originalSendMessage(messageOptions)
        })
    }

    // Wrap sendMessage to handle new chat creation with optimistic UI
    const sendMessage: typeof originalSendMessage = (options, requestOptions) => {
        if (!chatId) {
            // New chat flow - optimistic navigation
            const newChatId = generateId()

            // Extract text from the options (could be in different shapes)
            const messageText = options && 'text' in options ? options.text : ''

            // Create optimistic user message for immediate display
            const optimisticMessage = {
                id: generateId(),
                role: 'user' as const,
                parts: [{ type: 'text' as const, text: messageText || '' }],
            }

            // 1. Add optimistic message to local state FIRST
            setMessages([optimisticMessage as UIMessage])

            // 2. Store message options for the new route to pick up
            sessionStorage.setItem('pendingMessage', JSON.stringify({
                chatId: newChatId,
                ...options
            }))

            // 3. Update store and navigate immediately (synchronous, no flicker)
            setActiveChat(newChatId)
            navigate({
                to: '/chats/$chatId',
                params: { chatId: newChatId },
                replace: true
            })

            // Return resolved promise to match the expected type
            return Promise.resolve()
        }

        // Existing chat flow
        setThinking(true)
        return originalSendMessage(options, requestOptions)
    }

    // Wrap stop to clear thinking state
    const stop = () => {
        setThinking(false)
        return originalStop()
    }

    // isLoading combines hook status with store's isThinking for robustness
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