import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { unauthorized } from '@/server/lib/error'
import { db } from '@/db'
import { transactions, files } from '@/db/schema'
import { eq, and, desc, count, sum, sql } from 'drizzle-orm'
import { z } from 'zod'

// -------------------------------------------------------------------
// Validators
// -------------------------------------------------------------------

const listTransactionsSchema = z.object({
    taxYear: z.number().int().min(2000).max(2100).optional(),
    category: z.string().optional(),
    direction: z.enum(['credit', 'debit']).optional(),
    limit: z.number().int().min(1).max(200).default(50),
    offset: z.number().int().min(0).default(0),
})

const getTransactionSummarySchema = z.object({
    taxYear: z.number().int().min(2000).max(2100),
})

const listUserFilesSchema = z.object({
    taxYear: z.number().int().min(2000).max(2100).optional(),
})

const deleteFileSchema = z.object({
    fileId: z.string().uuid(),
})

// -------------------------------------------------------------------
// Server Functions
// -------------------------------------------------------------------

/**
 * List transactions for the current user
 */
export const listTransactions = createServerFn()
    .inputValidator((data: unknown) => listTransactionsSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const conditions: any[] = [eq(transactions.userId, user.id)]
        if (data.taxYear) conditions.push(eq(transactions.taxYear, data.taxYear))
        if (data.category) conditions.push(eq(transactions.category, data.category))
        if (data.direction) conditions.push(eq(transactions.direction, data.direction))

        const rows = await db.select()
            .from(transactions)
            .where(and(...conditions))
            .orderBy(desc(transactions.date))
            .limit(data.limit)
            .offset(data.offset)

        // Get total count
        const [{ total }] = await db.select({ total: count() })
            .from(transactions)
            .where(and(...conditions))

        return { transactions: rows, total }
    })

/**
 * Quick summary counts for a tax year
 */
export const getTransactionSummary = createServerFn()
    .inputValidator((data: unknown) => getTransactionSummarySchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const baseWhere = and(
            eq(transactions.userId, user.id),
            eq(transactions.taxYear, data.taxYear),
        )

        const [totals] = await db.select({
            totalTransactions: count(),
            totalIncome: sum(sql`CASE WHEN ${transactions.direction} = 'credit' THEN ${transactions.amount} ELSE 0 END`),
            totalExpenses: sum(sql`CASE WHEN ${transactions.direction} = 'debit' THEN ${transactions.amount} ELSE 0 END`),
        })
            .from(transactions)
            .where(baseWhere)

        // Count by category
        const categories = await db.select({
            category: transactions.category,
            count: count(),
            total: sum(transactions.amount),
        })
            .from(transactions)
            .where(baseWhere)
            .groupBy(transactions.category)

        return {
            totalTransactions: totals.totalTransactions,
            totalIncome: Number(totals.totalIncome || 0),
            totalExpenses: Number(totals.totalExpenses || 0),
            categories,
        }
    })

/**
 * List all files for the current user (with optional year filter)
 */
export const listUserFiles = createServerFn()
    .inputValidator((data: unknown) => listUserFilesSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const conditions: any[] = [eq(files.userId, user.id)]
        if (data.taxYear) conditions.push(eq(files.taxYear, data.taxYear))

        const rows = await db.select()
            .from(files)
            .where(and(...conditions))
            .orderBy(desc(files.createdAt))

        return { files: rows }
    })

/**
 * Delete a file
 */
export const deleteFile = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => deleteFileSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        await db.delete(files)
            .where(
                and(
                    eq(files.id, data.fileId),
                    eq(files.userId, user.id),
                )
            )

        return { success: true }
    })
