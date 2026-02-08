import { create } from 'zustand'
import type { UploadedFile, Message } from '@/types'

interface ChatState {
    // Data - Active Pointer
    activeChat: string | null

    // Data - Uploads (Client side only for now)
    uploadedFiles: UploadedFile[]

    // UI State
    isSidebarOpen: boolean
    isUploading: boolean
    isThinking: boolean

    // Streaming assistant (ephemeral, not persisted)
    streamingMessage?: Partial<Message>

    // Actions
    setActiveChat: (chatId: string | null) => void

    // Actions - Files
    addFile: (file: UploadedFile) => void
    updateFileStatus: (
        fileId: string,
        status: UploadedFile['status'],
        progress?: number
    ) => void
    removeFile: (fileId: string) => void

    // Actions - UI
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void

    // Thinking / Streaming
    setThinking: (isThinking: boolean) => void
    setStreamingMessage: (message?: Partial<Message>) => void
    updateStreamingMessage: (patch: Partial<Message>) => void
    clearStreamingMessage: () => void
}

export const useChatStore = create<ChatState>()((set) => ({
    activeChat: null,
    uploadedFiles: [],
    isSidebarOpen: true,
    isUploading: false,
    isThinking: false,

    streamingMessage: undefined,

    setActiveChat: (chatId) => {
        set({ activeChat: chatId })
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
                (f) =>
                    f.status === 'pending' ||
                    f.status === 'uploading' ||
                    f.status === 'processing'
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

    // Streaming lifecycle
    setThinking: (isThinking) => {
        set({ isThinking })
        if (!isThinking) {
            set({ streamingMessage: undefined })
        }
    },

    setStreamingMessage: (message) => {
        set({ streamingMessage: message })
    },

    updateStreamingMessage: (patch) => {
        set((state) => ({
            streamingMessage: {
                ...state.streamingMessage,
                ...patch,
            },
        }))
    },

    clearStreamingMessage: () => {
        set({ streamingMessage: undefined })
    },
}))
