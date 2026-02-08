import { z } from 'zod'

export const createChatSchema = z.object({
    message: z.string().optional(),
    attachments: z.array(z.any()).optional(), // Legacy compatible
    fileIds: z.array(z.string()).optional(), // New file linking
})

export const sendMessageSchema = z.object({
    chatId: z.string().uuid(),
    content: z.string(),
    role: z.enum(['user', 'assistant']),
    attachments: z.array(z.any()).optional(), // Legacy compatible
    fileIds: z.array(z.string()).optional(), // New file linking
})

export const getChatSchema = z.object({
    chatId: z.string(),
})

export const deleteChatSchema = z.object({
    chatId: z.string(),
})

export const editMessageSchema = z.object({
    chatId: z.string(),
    messageId: z.string(),
    content: z.string().min(1),
})
