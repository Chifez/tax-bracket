import { z } from 'zod'

export const getUploadUrlSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().positive(),
})

export const registerFileSchema = z.object({
    key: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().positive(),
    chatId: z.string().optional(), // If tied to a specific chat immediately
})
