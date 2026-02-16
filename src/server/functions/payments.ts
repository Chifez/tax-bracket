import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { unauthorized } from '@/server/lib/error'
import { getCreditConfig } from '@/server/lib/credits'
import { createCheckoutSession } from '@/server/lib/polar'
import { getPurchaseHistory as getLedgerPurchaseHistory, getTransactionByReference } from '@/server/lib/credit-ledger'

/**
 * Create a Polar checkout for credit purchase
 * With pay-what-you-want pricing, customer enters amount at checkout
 */
export const createCreditCheckout = createServerFn({ method: 'POST' })
    .inputValidator((input: unknown) => {
        const data = (input || {}) as { successUrl?: string; cancelUrl?: string }
        return data
    })
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const siteUrl = process.env.SITE_URL || 'http://localhost:3000'

        const checkout = await createCheckoutSession({
            userId: user.id,
            successUrl: data.successUrl || `${siteUrl}/payments/success`,
            cancelUrl: data.cancelUrl || `${siteUrl}/payments/cancel`,
            customerEmail: user.email,
        })

        return {
            checkoutId: checkout.checkoutId,
            checkoutUrl: checkout.checkoutUrl,
        }
    })

/**
 * Get purchase history for the current user
 * Queries the credit_transactions ledger for purchase-type transactions
 */
export const getPurchaseHistory = createServerFn().handler(async () => {
    const user = await getAuthenticatedUser()
    if (!user) throw unauthorized()

    const purchases = await getLedgerPurchaseHistory(user.id, 50)

    return purchases.map(p => ({
        id: p.id,
        amountUsd: p.metadata?.amountCents 
            ? (p.metadata.amountCents as number) / 100 
            : 0,
        creditsPurchased: p.amount,
        status: 'completed' as const, // Ledger only has completed transactions
        createdAt: p.createdAt.toISOString(),
        reference: p.reference,
    }))
})

/**
 * Get a specific purchase by reference (Polar checkout ID)
 */
export const getPurchase = createServerFn()
    .inputValidator((input: unknown) => {
        const data = input as { purchaseId?: string; reference?: string }
        if (!data.purchaseId && !data.reference) {
            throw new Error('Either purchaseId or reference is required')
        }
        return data
    })
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        // Look up by reference (checkout ID) - this is how success redirects work
        const reference = data.reference || data.purchaseId!
        const transaction = await getTransactionByReference(reference)

        if (!transaction) {
            return null
        }

        // Verify it belongs to this user
        if (transaction.userId !== user.id) {
            return null
        }

        return {
            id: transaction.id,
            amountUsd: transaction.metadata?.amountCents 
                ? (transaction.metadata.amountCents as number) / 100 
                : 0,
            creditsPurchased: transaction.amount,
            status: 'completed' as const,
            createdAt: transaction.createdAt.toISOString(),
            reference: transaction.reference,
        }
    })

/**
 * Get credit purchase pricing info
 */
export const getCreditPricing = createServerFn().handler(async () => {
    const config = getCreditConfig()

    return {
        pricePerThousand: config.pricePerThousand,
        creditsPerDollar: config.creditsPerDollar,
        tokensPerCredit: config.tokensPerCredit,
        minPurchase: 1.00,
        maxPurchase: 1000.00,
    }
})
