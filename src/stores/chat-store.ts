import { create } from 'zustand'
import { generateId } from '@/lib/utils'
import type { Chat, Message, UploadedFile } from '@/types'

interface ChatState {
    // Data
    chats: Chat[]
    activeChat: string | null
    uploadedFiles: UploadedFile[]

    // UI State
    isSidebarOpen: boolean
    isUploading: boolean
    isThinking: boolean

    // Actions - Chat
    createChat: () => string
    setActiveChat: (chatId: string | null) => void
    deleteChat: (chatId: string) => void

    // Actions - Messages
    addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
    updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void

    // Actions - Files
    addFile: (file: UploadedFile) => void
    updateFileStatus: (fileId: string, status: UploadedFile['status'], progress?: number) => void
    removeFile: (fileId: string) => void

    // Actions - UI
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    setThinking: (thinking: boolean) => void
}

export const useChatStore = create<ChatState>()((set, _get) => ({
    // Initial state
    chats: [],
    activeChat: null,
    uploadedFiles: [],
    isSidebarOpen: true,
    isUploading: false,
    isThinking: false,

    // Chat actions
    createChat: () => {
        const id = generateId()
        const now = new Date().toISOString()
        const newChat: Chat = {
            id,
            title: 'New Chat',
            createdAt: now,
            updatedAt: now,
            messages: [],
        }
        set((state) => ({
            chats: [newChat, ...state.chats],
            activeChat: id,
        }))
        return id
    },

    setActiveChat: (chatId) => {
        set({ activeChat: chatId })
    },

    deleteChat: (chatId) => {
        set((state) => {
            const newChats = state.chats.filter((c) => c.id !== chatId)
            const newActiveChat = state.activeChat === chatId
                ? (newChats[0]?.id ?? null)
                : state.activeChat
            return { chats: newChats, activeChat: newActiveChat }
        })
    },

    // Message actions
    addMessage: (chatId, message) => {
        const id = generateId()
        const timestamp = new Date().toISOString()
        const fullMessage: Message = { ...message, id, timestamp }

        set((state) => ({
            chats: state.chats.map((chat) => {
                if (chat.id !== chatId) return chat

                // Update chat title from first user message
                const isFirstUserMessage =
                    message.role === 'user' &&
                    chat.messages.filter((m) => m.role === 'user').length === 0

                const title = isFirstUserMessage
                    ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                    : chat.title

                return {
                    ...chat,
                    title,
                    updatedAt: timestamp,
                    messages: [...chat.messages, fullMessage],
                }
            }),
        }))
    },

    updateMessage: (chatId, messageId, updates) => {
        set((state) => ({
            chats: state.chats.map((chat) => {
                if (chat.id !== chatId) return chat
                return {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                        msg.id === messageId ? { ...msg, ...updates } : msg
                    ),
                }
            }),
        }))
    },

    // File actions
    addFile: (file) => {
        set((state) => ({
            uploadedFiles: [...state.uploadedFiles, file],
            isUploading: true,
        }))
    },

    updateFileStatus: (fileId, status, progress) => {
        set((state) => {
            const files = state.uploadedFiles.map((f) =>
                f.id === fileId
                    ? { ...f, status, progress: progress ?? f.progress }
                    : f
            )
            const stillUploading = files.some(
                (f) => f.status === 'pending' || f.status === 'uploading' || f.status === 'processing'
            )
            return { uploadedFiles: files, isUploading: stillUploading }
        })
    },

    removeFile: (fileId) => {
        set((state) => ({
            uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
        }))
    },

    // UI actions
    toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
    },

    setSidebarOpen: (open) => {
        set({ isSidebarOpen: open })
    },

    setThinking: (thinking) => {
        set({ isThinking: thinking })
    },
}))

// Selector hooks for better performance
export const useActiveChat = () => {
    const { chats, activeChat } = useChatStore()
    return chats.find((c) => c.id === activeChat) ?? null
}

export const useMessages = () => {
    const chat = useActiveChat()
    return chat?.messages ?? []
}
