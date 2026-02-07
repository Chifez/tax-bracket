import { z } from 'zod'

export const createChatSchema = z.object({
    message: z.string().optional(),
    attachments: z.array(z.object({
        name: z.string(),
        type: z.string(),
        size: z.number().optional(),
        url: z.string().optional(),
    })).optional()
})

export const sendMessageSchema = z.object({
    chatId: z.string(),
    content: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    attachments: z.array(z.object({
        name: z.string(),
        type: z.string(),
        size: z.number().optional(),
        url: z.string().optional(),
    })).optional()
})

export const getChatSchema = z.object({
    chatId: z.string(),
})

export const deleteChatSchema = z.object({
    chatId: z.string(),
})
