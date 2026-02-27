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
    chatId: z.string().optional(),
    taxYear: z.number().int().min(2000).max(2100).optional(),
    batchId: z.string().uuid().optional(),
    bankName: z.string().optional(),
})

export const deleteFileSchema = z.object({
    fileId: z.string().uuid(),
})

export const getFileStatusSchema = z.object({
    fileId: z.string().uuid(),
})
