import { useQuery } from '@tanstack/react-query'
import { getUserCredits } from '@/server/functions/credits'

export interface CreditStats {
    remaining: number
    limit: number
    used: number
    percentageUsed: number
    percentageRemaining: number
    resetAt: string
    daysUntilReset: number
    hoursUntilReset: number
    // Purchased credits fields
    purchasedCredits: number
    effectiveLimit: number
    tokensRemaining: number
    tokensLimit: number
    // Feature flags
    betaMode: boolean
    purchaseEnabled: boolean
    weeklyResetEnabled: boolean
}

export function useCredits() {
    return useQuery<CreditStats>({
        queryKey: ['credits'],
        queryFn: () => getUserCredits(),
        staleTime: 1000 * 60, // 1 minute
        refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    })
}
