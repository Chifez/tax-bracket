import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChats, getChat, deleteChat, editMessage } from '@/server/functions/chat'
import { useRouter } from '@tanstack/react-router'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai' // Import from 'ai' package
import type { UIMessage } from 'ai'
import { useState, useRef, useEffect } from 'react'

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
    const isThinking = useChatStore(state => state.isThinking)
    
    // Track the current effective chat ID - this is what we send to the API
    // We use a ref that we update, but also need state to trigger transport recreation
    const effectiveChatIdRef = useRef<string | null>(chatId)
    const [currentChatId, setCurrentChatId] = useState<string | null>(chatId)
    
    // Sync the ref with prop when chatId changes from external navigation
    useEffect(() => {
        if (chatId !== null && chatId !== effectiveChatIdRef.current) {
            effectiveChatIdRef.current = chatId
            setCurrentChatId(chatId)
        }
    }, [chatId])

    const {
        messages,
        sendMessage: originalSendMessage,
        status,
        setMessages,
        regenerate,
        stop: originalStop
    } = useChat({
        // Use currentChatId for hook identity - allows proper message tracking
        id: currentChatId || 'new-chat',
        messages: initialMessages,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            // Use a getter function pattern - read current value at request time
            get body() {
                return {
                    chatId: effectiveChatIdRef.current,
                }
            },
            async fetch(url, options) {
                // Read the CURRENT value of the ref at fetch time
                const currentEffectiveChatId = effectiveChatIdRef.current
                
                // Parse and update the body with the current chat ID
                const originalBody = options?.body ? JSON.parse(options.body as string) : {}
                const updatedBody = {
                    ...originalBody,
                    chatId: currentEffectiveChatId,
                }
                
                const response = await fetch(url, {
                    ...options,
                    body: JSON.stringify(updatedBody),
                })

                const returnedChatId = response.headers.get('x-chat-id')
                const isNewChat = response.headers.get('x-is-new-chat') === 'true'

                if (isNewChat && returnedChatId && returnedChatId !== currentEffectiveChatId) {
                    // Update the ref immediately so subsequent requests use the new ID
                    effectiveChatIdRef.current = returnedChatId
                    // Update URL without triggering full React state change yet
                    window.history.replaceState({}, '', `/chats/${returnedChatId}`)
                }

                return response
            }
        }),
        onFinish: async (_options) => {
            const finalChatId = effectiveChatIdRef.current

            // Invalidate queries with the correct chat ID
            await queryClient.invalidateQueries({ queryKey: ['chats'] })
            if (finalChatId) {
                await queryClient.invalidateQueries({ queryKey: ['chat', finalChatId] })
                
                // Now sync React state with the ref
                setCurrentChatId(finalChatId)
                
                // Update active chat in store AFTER stream finishes
                setActiveChat(finalChatId)
            }

            // Clear thinking state after a small delay for UI to catch up
            setTimeout(() => {
                setThinking(false)
            }, 300)
        },
        onError: (error) => {
            setThinking(false)
            toast.error("Error: " + error.message)
        }
    })

    // Wrap sendMessage to immediately set thinking state in the store
    const sendMessage: typeof originalSendMessage = (options) => {
        // Set thinking state BEFORE sending - this is the source of truth for UI
        setThinking(true)
        return originalSendMessage(options)
    }

    // Wrap stop to clear thinking state
    const stop = () => {
        setThinking(false)
        return originalStop()
    }

    // isLoading combines hook status with store's isThinking for robustness
    // isThinking is stable across re-renders, status may reset if hook re-instantiates
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