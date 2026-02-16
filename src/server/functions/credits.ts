import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { unauthorized } from '@/server/lib/error'
import { getCreditStats } from '@/server/lib/credits'

/**
 * Get credit statistics for the current user
 */
export const getUserCredits = createServerFn({ method: 'GET' })
    .handler(async () => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const stats = await getCreditStats(user.id)

        return {
            remaining: stats.remaining,
            limit: stats.limit,
            used: stats.used,
            percentageUsed: stats.percentageUsed,
            resetAt: stats.resetAt.toISOString(),
            daysUntilReset: stats.daysUntilReset,
            hoursUntilReset: stats.hoursUntilReset,
            // Purchased credits
            purchasedCredits: stats.purchasedCredits,
            effectiveLimit: stats.effectiveLimit,
            tokensRemaining: stats.tokensRemaining,
            tokensLimit: stats.tokensLimit,
            // Feature flags
            betaMode: stats.betaMode,
            purchaseEnabled: stats.purchaseEnabled,
            weeklyResetEnabled: stats.weeklyResetEnabled,
        }
    })
