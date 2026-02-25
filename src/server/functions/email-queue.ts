/**
 * Server-only email queue helpers.
 * These call pg-boss directly and must NEVER be imported by client-side code.
 * Import these only from other server functions (auth.ts, oauth.ts, etc.)
 */
import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { z } from 'zod'

const authEmailSchema = z.object({
    to: z.string().email(),
    name: z.string(),
    type: z.enum(['welcome', 'password-reset', 'password-changed']),
    resetLink: z.string().optional(),
})

const productUpdateEmailSchema = z.object({
    to: z.string().email(),
    name: z.string(),
    subject: z.string(),
    content: z.string(),
})

export const queueAuthEmail = async (payload: z.infer<typeof authEmailSchema>) => {
    const boss = await getQueue()
    await boss.send(QUEUE_NAMES.SEND_AUTH_EMAIL, authEmailSchema.parse(payload))
}

export const queueProductUpdateEmail = async (payload: z.infer<typeof productUpdateEmailSchema>) => {
    const boss = await getQueue()
    await boss.send(QUEUE_NAMES.SEND_PRODUCT_UPDATE_EMAIL, productUpdateEmailSchema.parse(payload))
}
