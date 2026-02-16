import { checkSufficientCredits, getNextWeekStart } from '@/server/lib/credits'

export interface CreditCheckResult {
    allowed: boolean
    remaining: number
    limit: number
    resetAt: Date
    headers: Record<string, string>
}

/**
 * Check if a user has sufficient credits for an AI request.
 * Returns headers that should be included in the response.
 */
export async function checkCreditsMiddleware(userId: string): Promise<CreditCheckResult> {
    const credits = await checkSufficientCredits(userId)

    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(credits.limit),
        'X-RateLimit-Remaining': String(credits.remaining),
        'X-RateLimit-Reset': String(Math.floor(credits.resetAt.getTime() / 1000)),
    }

    return {
        allowed: credits.sufficient,
        remaining: credits.remaining,
        limit: credits.limit,
        resetAt: credits.resetAt,
        headers,
    }
}

/**
 * Create an error response for insufficient credits
 */
export function createInsufficientCreditsResponse(_resetAt: Date): Response {
    const nextReset = getNextWeekStart()
    const now = new Date()
    const msUntilReset = nextReset.getTime() - now.getTime()
    const hoursUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60))

    return new Response(
        JSON.stringify({
            error: 'Insufficient credits',
            message: `You've used all your weekly credits. Credits reset every Monday at 00:00 UTC.`,
            resetAt: nextReset.toISOString(),
            hoursUntilReset,
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil(msUntilReset / 1000)),
                'X-RateLimit-Limit': '1000',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.floor(nextReset.getTime() / 1000)),
            },
        }
    )
}
