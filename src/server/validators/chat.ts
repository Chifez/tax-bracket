import { z } from 'zod'

export const createChatSchema = z.object({
    message: z.string().optional(),
})

export const sendMessageSchema = z.object({
    chatId: z.string(),
    content: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
})

export const getChatSchema = z.object({
    chatId: z.string(),
})

export const deleteChatSchema = z.object({
    chatId: z.string(),
})
