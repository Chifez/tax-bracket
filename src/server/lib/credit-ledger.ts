/**
 * Credit Ledger Utilities
 * 
 * All credit changes flow through this ledger for full audit trail.
 * Balance is calculated from SUM of transactions, not stored fields.
 * All operations are idempotent via the reference field.
 */

import { db } from '@/db'
import { creditTransactions } from '@/db/schema/credit-transactions'
import { eq, sql, desc, and, gte } from 'drizzle-orm'
import { dollarsToCredits, tokensToCredits } from './credits'

export type TransactionType = 'purchase' | 'usage' | 'refund' | 'weekly_grant'

/**
 * Get user's current credit balance (sum of all transactions)
 */
export async function getCreditBalance(userId: string): Promise<number> {
    const result = await db
        .select({
            balance: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))

    return Number(result[0]?.balance || 0)
}

/**
 * Get credits used since a specific date (for weekly usage calculation)
 */
export async function getCreditsUsedSince(userId: string, since: Date): Promise<number> {
    const result = await db
        .select({
            used: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)`,
        })
        .from(creditTransactions)
        .where(
            and(
                eq(creditTransactions.userId, userId),
                eq(creditTransactions.type, 'usage'),
                gte(creditTransactions.createdAt, since)
            )
        )

    return Number(result[0]?.used || 0)
}

/**
 * Get total purchased credits for a user
 */
export async function getTotalPurchasedCredits(userId: string): Promise<number> {
    const result = await db
        .select({
            total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`,
        })
        .from(creditTransactions)
        .where(
            and(
                eq(creditTransactions.userId, userId),
                eq(creditTransactions.type, 'purchase')
            )
        )

    return Number(result[0]?.total || 0)
}

/**
 * Check if a transaction with this reference already exists (idempotency)
 */
export async function transactionExists(reference: string): Promise<boolean> {
    const existing = await db.query.creditTransactions.findFirst({
        where: eq(creditTransactions.reference, reference),
        columns: { id: true }
    })
    return !!existing
}

/**
 * Add a credit transaction (purchase, refund, or weekly grant)
 * Idempotent: If reference already exists, returns existing balance without inserting
 */
export async function addCreditTransaction(params: {
    userId: string
    amount: number // Amount in credits (positive for purchase/grant, negative for refund)
    type: TransactionType
    reference: string // Unique reference for idempotency
    metadata?: Record<string, unknown>
}): Promise<{ success: boolean; newBalance: number; transactionId: string | null; alreadyExists: boolean }> {
    // Check idempotency first
    const exists = await transactionExists(params.reference)
    if (exists) {
        const balance = await getCreditBalance(params.userId)
        return {
            success: true,
            newBalance: balance,
            transactionId: null,
            alreadyExists: true,
        }
    }

    // Insert the transaction
    const [transaction] = await db
        .insert(creditTransactions)
        .values({
            userId: params.userId,
            amount: params.amount,
            type: params.type,
            reference: params.reference,
            metadata: params.metadata,
        })
        .returning({ id: creditTransactions.id })

    const newBalance = await getCreditBalance(params.userId)

    return {
        success: true,
        newBalance,
        transactionId: transaction.id,
        alreadyExists: false,
    }
}

/**
 * Add purchase credits (from Polar payment)
 * Converts cents to credits automatically
 */
export async function addPurchaseCredits(params: {
    userId: string
    amountCents: number // Amount in cents from Polar
    reference: string // Polar checkout ID
    metadata?: Record<string, unknown>
}): Promise<{ success: boolean; newBalance: number; creditsAdded: number; alreadyExists: boolean }> {
    const credits = dollarsToCredits(params.amountCents / 100)
    
    const result = await addCreditTransaction({
        userId: params.userId,
        amount: credits,
        type: 'purchase',
        reference: params.reference,
        metadata: {
            amountCents: params.amountCents,
            ...params.metadata,
        },
    })

    return {
        success: result.success,
        newBalance: result.newBalance,
        creditsAdded: result.alreadyExists ? 0 : credits,
        alreadyExists: result.alreadyExists,
    }
}

/**
 * Deduct credits for AI usage
 * Idempotent: Won't deduct twice for the same reference
 * Prevents negative balance (won't deduct more than available)
 */
export async function deductCreditsFromLedger(params: {
    userId: string
    tokensUsed: number // Number of tokens consumed
    reference: string // Unique request ID (e.g., messageId or chatId-messageId)
    metadata?: Record<string, unknown>
}): Promise<{ success: boolean; deducted: number; newBalance: number; alreadyDeducted: boolean }> {
    // Check idempotency first
    const exists = await transactionExists(params.reference)
    if (exists) {
        const balance = await getCreditBalance(params.userId)
        return {
            success: true,
            deducted: 0,
            newBalance: balance,
            alreadyDeducted: true,
        }
    }

    // Calculate credits to deduct
    const creditsToDeduct = tokensToCredits(params.tokensUsed)
    
    // Check current balance
    const currentBalance = await getCreditBalance(params.userId)
    
    // Prevent negative balance - deduct what we can
    const actualDeduction = Math.min(creditsToDeduct, currentBalance)
    
    if (actualDeduction <= 0) {
        return {
            success: false,
            deducted: 0,
            newBalance: currentBalance,
            alreadyDeducted: false,
        }
    }

    // Insert negative transaction
    await db.insert(creditTransactions).values({
        userId: params.userId,
        amount: -actualDeduction, // Negative for deduction
        type: 'usage',
        reference: params.reference,
        metadata: {
            tokensUsed: params.tokensUsed,
            requestedDeduction: creditsToDeduct,
            actualDeduction,
            ...params.metadata,
        },
    })

    const newBalance = await getCreditBalance(params.userId)

    return {
        success: true,
        deducted: actualDeduction,
        newBalance,
        alreadyDeducted: false,
    }
}

/**
 * Add weekly grant credits
 * Idempotent: Uses date-based reference to prevent double grants
 */
export async function addWeeklyGrant(params: {
    userId: string
    amount: number // Weekly credit limit
    weekDate: string // Format: YYYY-MM-DD (Monday of the week)
}): Promise<{ success: boolean; newBalance: number; alreadyGranted: boolean }> {
    const reference = `weekly-grant-${params.weekDate}-${params.userId}`
    
    const result = await addCreditTransaction({
        userId: params.userId,
        amount: params.amount,
        type: 'weekly_grant',
        reference,
        metadata: {
            weekDate: params.weekDate,
        },
    })

    return {
        success: result.success,
        newBalance: result.newBalance,
        alreadyGranted: result.alreadyExists,
    }
}

/**
 * Process a refund
 * Idempotent: Uses refund reference to prevent double refunds
 */
export async function processRefund(params: {
    userId: string
    amount: number // Positive number of credits to refund
    reference: string // Original purchase reference or refund ID
    metadata?: Record<string, unknown>
}): Promise<{ success: boolean; newBalance: number; alreadyRefunded: boolean }> {
    const refundReference = `refund-${params.reference}`
    
    const result = await addCreditTransaction({
        userId: params.userId,
        amount: -params.amount, // Negative because we're removing credits
        type: 'refund',
        reference: refundReference,
        metadata: params.metadata,
    })

    return {
        success: result.success,
        newBalance: result.newBalance,
        alreadyRefunded: result.alreadyExists,
    }
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(
    userId: string,
    limit: number = 50,
    type?: TransactionType
): Promise<Array<{
    id: string
    amount: number
    type: TransactionType
    reference: string
    metadata: Record<string, unknown> | null
    createdAt: Date
}>> {
    const conditions = type
        ? and(eq(creditTransactions.userId, userId), eq(creditTransactions.type, type))
        : eq(creditTransactions.userId, userId)

    const results = await db
        .select({
            id: creditTransactions.id,
            amount: creditTransactions.amount,
            type: creditTransactions.type,
            reference: creditTransactions.reference,
            metadata: creditTransactions.metadata,
            createdAt: creditTransactions.createdAt,
        })
        .from(creditTransactions)
        .where(conditions)
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit)

    return results.map(r => ({
        ...r,
        metadata: r.metadata as Record<string, unknown> | null,
    }))
}

/**
 * Get purchase history for a user (for UI display)
 */
export async function getPurchaseHistory(userId: string, limit: number = 50) {
    return getTransactionHistory(userId, limit, 'purchase')
}

/**
 * Get a specific transaction by reference
 */
export async function getTransactionByReference(reference: string) {
    return db.query.creditTransactions.findFirst({
        where: eq(creditTransactions.reference, reference),
    })
}
