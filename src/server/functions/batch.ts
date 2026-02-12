import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { unauthorized } from '@/server/lib/error'
import { db } from '@/db'
import { uploadBatches } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

// -------------------------------------------------------------------
// Validators
// -------------------------------------------------------------------

const createBatchSchema = z.object({
    taxYear: z.number().int().min(2000).max(2100),
    label: z.string().optional(),
})

const getBatchSchema = z.object({
    batchId: z.string().uuid(),
})

const listBatchesSchema = z.object({
    taxYear: z.number().int().min(2000).max(2100).optional(),
})

const deleteBatchSchema = z.object({
    batchId: z.string().uuid(),
})

// -------------------------------------------------------------------
// Server Functions
// -------------------------------------------------------------------

/**
 * Create a new upload batch
 */
export const createBatch = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => createBatchSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const [batch] = await db.insert(uploadBatches).values({
            userId: user.id,
            taxYear: data.taxYear,
            label: data.label || 'Bank Statements',
            status: 'pending',
        }).returning()

        return { batch }
    })

/**
 * Get a specific batch with its files
 */
export const getBatch = createServerFn()
    .inputValidator((data: unknown) => getBatchSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const batch = await db.query.uploadBatches.findFirst({
            where: and(
                eq(uploadBatches.id, data.batchId),
                eq(uploadBatches.userId, user.id),
            ),
            with: { files: true },
        })

        if (!batch) return null
        return { batch }
    })

/**
 * List all batches for the current user
 */
export const listBatches = createServerFn()
    .inputValidator((data: unknown) => listBatchesSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const conditions = [eq(uploadBatches.userId, user.id)]
        if (data.taxYear) {
            conditions.push(eq(uploadBatches.taxYear, data.taxYear))
        }

        const batches = await db.query.uploadBatches.findMany({
            where: and(...conditions),
            with: { files: true },
            orderBy: [desc(uploadBatches.createdAt)],
        })

        return { batches }
    })

/**
 * Delete a batch and its association (files are preserved)
 */
export const deleteBatch = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => deleteBatchSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        await db.delete(uploadBatches)
            .where(
                and(
                    eq(uploadBatches.id, data.batchId),
                    eq(uploadBatches.userId, user.id),
                )
            )

        return { success: true }
    })
