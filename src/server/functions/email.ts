/**
 * Client-facing server function for support/feedback emails.
 * Safe to import from components — does NOT import pg-boss directly.
 * The actual queue enqueue happens inside the handler (server-side only).
 */
import { createServerFn } from '@tanstack/react-start'
import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { z } from 'zod'

const supportEmailSchema = z.object({
    fromName: z.string().min(1),
    fromEmail: z.string().email(),
    type: z.enum(['support', 'feedback']),
    subject: z.string().min(1).max(200),
    message: z.string().min(10).max(5000),
})

export const queueSupportEmail = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => supportEmailSchema.parse(data))
    .handler(async ({ data }) => {
        const boss = await getQueue()
        await boss.send(QUEUE_NAMES.SEND_SUPPORT_EMAIL, data)
        return { success: true }
    })
