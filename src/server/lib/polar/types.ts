/**
 * Polar types for credit purchase integration
 * Simplified types for use with the official SDK
 */

/**
 * Checkout creation parameters (used internally)
 */
export interface CreateCheckoutParams {
    userId: string
    successUrl: string
    cancelUrl?: string
    customerEmail?: string
}

/**
 * Checkout creation response
 */
export interface CreateCheckoutResponse {
    checkoutId: string
    checkoutUrl: string
}

/**
 * Extracted checkout data from webhook
 */
export interface CheckoutData {
    checkoutId: string
    amountCents: number
    userId: string | null
    customerEmail: string | null
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
    valid: boolean
    event?: unknown
    error?: string
}
