import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getFeatureFlags } from './feature-flags'
import {
    getCreditBalance,
    getCreditsUsedSince,
    getTotalPurchasedCredits,
    deductCreditsFromLedger,
    addWeeklyGrant,
} from './credit-ledger'

// Credit system configuration
const DEFAULT_CREDITS_LIMIT = parseInt(process.env.CREDITS_WEEKLY_LIMIT || '1000', 10)

// Credit-to-token conversion rate
// Default: 0.1 credits per token = 10 tokens per credit = 10,000 tokens per 1000 credits
const CREDITS_PER_TOKEN = parseFloat(process.env.CREDITS_PER_TOKEN || '0.1')

// Price per 1000 credits (for display)
const CREDIT_PRICE_PER_1000 = parseFloat(process.env.CREDIT_PRICE_PER_1000 || '1.00')

// Credits per dollar (for purchase calculations)
const CREDITS_PER_DOLLAR = parseInt(process.env.CREDITS_PER_DOLLAR || '1000', 10)

/**
 * Convert tokens to credits
 */
export function tokensToCredits(tokens: number): number {
    return Math.ceil(tokens * CREDITS_PER_TOKEN)
}

/**
 * Convert credits to tokens (for display/estimation)
 */
export function creditsToTokens(credits: number): number {
    return Math.floor(credits / CREDITS_PER_TOKEN)
}

/**
 * Calculate credits for a dollar amount
 */
export function dollarsToCredits(dollars: number): number {
    return Math.floor(dollars * CREDITS_PER_DOLLAR)
}

/**
 * Calculate dollar cost for credits
 */
export function creditsToDollars(credits: number): number {
    return (credits / 1000) * CREDIT_PRICE_PER_1000
}

/**
 * Get credit system configuration
 */
export function getCreditConfig() {
    return {
        creditsPerToken: CREDITS_PER_TOKEN,
        tokensPerCredit: 1 / CREDITS_PER_TOKEN,
        pricePerThousand: CREDIT_PRICE_PER_1000,
        creditsPerDollar: CREDITS_PER_DOLLAR,
        defaultLimit: DEFAULT_CREDITS_LIMIT,
    }
}

/**
 * Get the start of the current week (Monday 00:00 UTC)
 */
export function getCurrentWeekStart(): Date {
    const now = new Date()
    const day = now.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + diff,
        0, 0, 0, 0
    ))
    return monday
}

/**
 * Get the start of the next week (next Monday 00:00 UTC)
 */
export function getNextWeekStart(): Date {
    const currentWeekStart = getCurrentWeekStart()
    const nextMonday = new Date(currentWeekStart)
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 7)
    return nextMonday
}

/**
 * Format date as YYYY-MM-DD for weekly grant reference
 */
function formatDateForReference(date: Date): string {
    return date.toISOString().split('T')[0]
}

/**
 * Get available credits for a user (calculated from ledger)
 */
export async function getAvailableCredits(userId: string): Promise<{
    remaining: number
    limit: number
    used: number
    resetAt: Date
    purchasedCredits: number
    effectiveLimit: number
}> {
    // Get user for their weekly limit
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            creditsLimit: true,
        }
    })

    if (!user) {
        throw new Error('User not found')
    }

    const weekStart = getCurrentWeekStart()

    // Calculate values from ledger
    const [totalBalance, weeklyUsed, purchasedCredits] = await Promise.all([
        getCreditBalance(userId),
        getCreditsUsedSince(userId, weekStart),
        getTotalPurchasedCredits(userId),
    ])

    // Effective limit = weekly limit + purchased credits
    const effectiveLimit = user.creditsLimit + purchasedCredits
    const remaining = Math.max(0, totalBalance)

    return {
        remaining,
        limit: user.creditsLimit,
        used: weeklyUsed,
        resetAt: getNextWeekStart(),
        purchasedCredits,
        effectiveLimit,
    }
}

/**
 * Check if user has sufficient credits for a request
 */
export async function checkSufficientCredits(
    userId: string,
    estimatedTokens: number = 0
): Promise<{
    sufficient: boolean
    remaining: number
    limit: number
    resetAt: Date
    estimatedCreditsNeeded: number
}> {
    const credits = await getAvailableCredits(userId)
    const estimatedCreditsNeeded = tokensToCredits(estimatedTokens)

    return {
        sufficient: credits.remaining > estimatedCreditsNeeded,
        remaining: credits.remaining,
        limit: credits.effectiveLimit,
        resetAt: credits.resetAt,
        estimatedCreditsNeeded,
    }
}

/**
 * Deduct credits after a request completes
 * Uses ledger for idempotent deduction
 */
export async function deductCredits(
    userId: string,
    tokensUsed: number,
    requestId: string // Unique ID for idempotency
): Promise<{
    success: boolean
    remaining: number
    creditsDeducted: number
    tokensUsed: number
}> {
    const result = await deductCreditsFromLedger({
        userId,
        tokensUsed,
        reference: requestId,
        metadata: {
            tokensUsed,
        },
    })

    return {
        success: result.success,
        remaining: result.newBalance,
        creditsDeducted: result.deducted,
        tokensUsed,
    }
}

/**
 * Initialize credits for a new user
 * No longer updates user table fields, just sets their limit
 */
export async function initializeUserCredits(userId: string): Promise<void> {
    await db.update(users)
        .set({
            creditsLimit: DEFAULT_CREDITS_LIMIT,
        })
        .where(eq(users.id, userId))
}

/**
 * Grant weekly credits to all users
 * Uses ledger transactions instead of updating user fields
 */
export async function resetAllUsersCredits(): Promise<{ count: number; skipped: boolean }> {
    const flags = getFeatureFlags()

    // Only run weekly grants if weekly resets are enabled
    if (!flags.weeklyCreditsReset) {
        console.log('Weekly credit grant skipped: not in beta mode or purchases enabled')
        return { count: 0, skipped: true }
    }

    const weekDate = formatDateForReference(getCurrentWeekStart())

    // Get all users
    const allUsers = await db.query.users.findMany({
        columns: {
            id: true,
            creditsLimit: true,
        }
    })

    let grantedCount = 0

    // Grant weekly credits to each user via ledger
    for (const user of allUsers) {
        const result = await addWeeklyGrant({
            userId: user.id,
            amount: user.creditsLimit,
            weekDate,
        })

        if (!result.alreadyGranted) {
            grantedCount++
        }
    }

    console.log(`[WeeklyGrant] Granted credits to ${grantedCount} users for week ${weekDate}`)
    return { count: grantedCount, skipped: false }
}

/**
 * Get credit statistics for a user (for UI display)
 * All values calculated from ledger
 */
export async function getCreditStats(userId: string) {
    const credits = await getAvailableCredits(userId)
    const config = getCreditConfig()
    const flags = getFeatureFlags()
    const nextReset = credits.resetAt

    const now = new Date()
    const msUntilReset = nextReset.getTime() - now.getTime()
    const daysUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60 * 24))
    const hoursUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60))

    const percentageUsed = credits.effectiveLimit > 0
        ? Math.round((credits.used / credits.effectiveLimit) * 100)
        : 0

    return {
        remaining: credits.remaining,
        limit: credits.limit,
        used: credits.used,
        effectiveLimit: credits.effectiveLimit,
        purchasedCredits: credits.purchasedCredits,
        percentageUsed,
        daysUntilReset,
        hoursUntilReset,
        resetAt: nextReset,
        resetDateFormatted: nextReset.toISOString(),
        tokensRemaining: creditsToTokens(credits.remaining),
        tokensLimit: creditsToTokens(credits.effectiveLimit),
        config,
        betaMode: flags.betaMode,
        purchaseEnabled: flags.creditPurchaseEnabled,
        weeklyResetEnabled: flags.weeklyCreditsReset,
    }
}
