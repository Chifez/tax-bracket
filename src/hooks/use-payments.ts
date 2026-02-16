import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCreditCheckout, getPurchaseHistory, getPurchase, getCreditPricing } from '@/server/functions/payments'

interface CheckoutResult {
    checkoutId: string
    checkoutUrl: string
}

/**
 * Hook for initiating credit checkout via Polar
 * With pay-what-you-want pricing, the customer enters amount at checkout
 */
export function useCreditCheckout() {
    const queryClient = useQueryClient()

    const checkoutMutation = useMutation({
        mutationFn: async (options?: { successUrl?: string; cancelUrl?: string }): Promise<CheckoutResult> => {
            return createCreditCheckout(options || {})
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credits'] })
            queryClient.invalidateQueries({ queryKey: ['purchase-history'] })
        },
    })

    return {
        createCheckout: checkoutMutation.mutate,
        createCheckoutAsync: checkoutMutation.mutateAsync,
        isCreating: checkoutMutation.isPending,
        error: checkoutMutation.error,
        checkoutUrl: checkoutMutation.data?.checkoutUrl,
    }
}

/**
 * Hook for purchase history
 */
export function usePurchaseHistory() {
    return useQuery({
        queryKey: ['purchase-history'],
        queryFn: () => getPurchaseHistory(),
    })
}

/**
 * Hook for getting a specific purchase by reference
 */
export function usePurchase(reference: string | undefined) {
    return useQuery({
        queryKey: ['purchase', reference],
        queryFn: () => getPurchase({ data: { reference: reference! } }),
        enabled: !!reference,
    })
}

/**
 * Hook for credit pricing info
 */
export function useCreditPricing() {
    return useQuery({
        queryKey: ['credit-pricing'],
        queryFn: () => getCreditPricing(),
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
    })
}

// Legacy export for backwards compatibility
export const useCreditPurchase = useCreditCheckout
