import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { unauthorized } from '@/server/lib/error'
import { db } from '@/db'
import { taxContext } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { buildContext } from '@/server/lib/context-builder'
import { computeAggregates } from '@/server/lib/aggregator'
import type { CompactTaxContext } from '@/db/schema/tax-context'
import { z } from 'zod'

const getTaxContextSchema = z.object({
    taxYear: z.number().int().min(2000).max(2100),
})

const regenerateContextSchema = z.object({
    taxYear: z.number().int().min(2000).max(2100),
})

/**
 * Get the current compact tax context for a user + tax year.
 * Returns null if no context exists.
 */
export const getTaxContext = createServerFn()
    .inputValidator((data: unknown) => getTaxContextSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const row = await db.select()
            .from(taxContext)
            .where(
                and(
                    eq(taxContext.userId, user.id),
                    eq(taxContext.taxYear, data.taxYear),
                )
            )
            .limit(1)

        if (row.length === 0) return { context: null, tokenEstimate: 0 }

        return {
            context: row[0].contextJson as CompactTaxContext,
            tokenEstimate: row[0].tokenEstimate,
            version: row[0].version,
        }
    })

/**
 * Force a context regeneration (recompute aggregates + rebuild context).
 * Used when user explicitly requests recalculation.
 */
export const regenerateContext = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => regenerateContextSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        // Recompute aggregates from scratch
        await computeAggregates(user.id, data.taxYear)

        // Rebuild context
        const context = await buildContext(user.id, data.taxYear)

        return {
            context,
            success: true,
        }
    })
