import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { revokeAllUserSessions } from '@/server/lib/session'
import { useAppSession } from '@/server/lib/session'
import { z } from 'zod'

const updateSettingsSchema = z.object({
    allowAnalytics: z.boolean().optional(),
    allowProductUpdates: z.boolean().optional(),
})

export const updateSettings = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => updateSettingsSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw new Error('Not authenticated')

        await db.update(users)
            .set({
                ...(data.allowAnalytics !== undefined && { allowAnalytics: data.allowAnalytics }),
                ...(data.allowProductUpdates !== undefined && { allowProductUpdates: data.allowProductUpdates }),
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id))

        return { success: true }
    })

export const deleteUserAccount = createServerFn({ method: 'POST' })
    .handler(async () => {
        const user = await getAuthenticatedUser()
        if (!user) throw new Error('Not authenticated')

        await revokeAllUserSessions(user.id)

        await db.delete(users).where(eq(users.id, user.id))

        const appSession = await useAppSession()
        await appSession.clear()

        return { success: true }
    })

