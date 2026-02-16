/**
 * Polar SDK client for credit purchase integration
 * Uses the official @polar-sh/sdk package
 */

import { Polar } from '@polar-sh/sdk'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'

// Initialize Polar client lazily to avoid startup errors if not configured
let polarClient: Polar | null = null

function getPolarClient(): Polar {
    if (!polarClient) {
        const accessToken = process.env.POLAR_ACCESS_TOKEN
        if (!accessToken) {
            throw new Error('POLAR_ACCESS_TOKEN environment variable is required')
        }

        polarClient = new Polar({
            accessToken,
            server: process.env.POLAR_MODE === 'production' ? 'production' : 'sandbox',
        })
    }
    return polarClient
}

/**
 * Get the configured Credits product ID
 */
function getCreditsProductId(): string {
    const productId = process.env.POLAR_CREDITS_PRODUCT_ID
    if (!productId) {
        throw new Error('POLAR_CREDITS_PRODUCT_ID environment variable is required')
    }
    return productId
}

/**
 * Create a checkout session for credit purchase
 * With pay-what-you-want pricing, the customer enters the amount at checkout
 */
export async function createCheckoutSession(params: {
    userId: string
    successUrl: string
    cancelUrl?: string
    customerEmail?: string
}): Promise<{ checkoutId: string; checkoutUrl: string }> {
    const polar = getPolarClient()
    const productId = getCreditsProductId()

    const checkout = await polar.checkouts.create({
        products: [productId],
        successUrl: params.successUrl,
        metadata: {
            userId: params.userId,
        },
        customerEmail: params.customerEmail,
    })

    return {
        checkoutId: checkout.id,
        checkoutUrl: checkout.url,
    }
}

/**
 * Get checkout session details
 */
export async function getCheckoutSession(checkoutId: string) {
    const polar = getPolarClient()
    return polar.checkouts.get({ id: checkoutId })
}

/**
 * Verify webhook signature and parse event using official SDK
 */
export function verifyWebhook(
    payload: string,
    headers: Headers
): { valid: boolean; event?: unknown; error?: string } {
    try {
        const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
        if (!webhookSecret) {
            console.error('[PolarWebhook] POLAR_WEBHOOK_SECRET not configured')
            return { valid: false, error: 'POLAR_WEBHOOK_SECRET not configured' }
        }

        // Convert Headers to plain object for the SDK
        const headersObject: Record<string, string> = {}
        headers.forEach((value, key) => {
            headersObject[key] = value
        })

        const event = validateEvent(payload, headersObject, webhookSecret)
        return { valid: true, event }
    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            console.error('[PolarWebhook] Signature verification failed:', error.message)
            return { valid: false, error: 'Invalid webhook signature' }
        }
        console.error('[PolarWebhook] Unexpected error:', error)
        return { valid: false, error: 'Failed to verify webhook' }
    }
}

/**
 * Extract checkout data from a webhook event
 */
export function extractCheckoutData(event: unknown): {
    checkoutId: string
    amountCents: number
    userId: string | null
    customerEmail: string | null
} | null {
    const e = event as {
        type: string
        data: {
            id?: string
            amount?: number
            amount_total?: number
            metadata?: Record<string, string>
            customer_email?: string
        }
    }

    if (!e.data) {
        return null
    }

    const checkoutId = e.data.id
    // Polar uses amount or amount_total depending on the event
    const amountCents = e.data.amount_total ?? e.data.amount ?? 0
    const userId = e.data.metadata?.userId ?? null
    const customerEmail = e.data.customer_email ?? null

    if (!checkoutId) {
        return null
    }

    return {
        checkoutId,
        amountCents,
        userId,
        customerEmail,
    }
}

/**
 * Check if event is a checkout completion event
 */
export function isCheckoutCompleted(event: unknown): boolean {
    const e = event as { type: string }
    return e.type === 'checkout.completed' || e.type === 'checkout_session.completed'
}
