import { createFileRoute } from '@tanstack/react-router'
import { verifyWebhook, extractCheckoutData, isCheckoutCompleted } from '@/server/lib/polar'
import { addPurchaseCredits, processRefund } from '@/server/lib/credit-ledger'

export const Route = createFileRoute('/api/webhooks/polar')({
    server: {
        handlers: {
            POST: async ({ request }: { request: Request }) => {
                const payload = await request.text()

                // Verify webhook signature using official SDK
                const verification = verifyWebhook(payload, request.headers)

                if (!verification.valid || !verification.event) {
                    console.error('[PolarWebhook] Invalid webhook:', verification.error)
                    return new Response(
                        JSON.stringify({ error: verification.error || 'Invalid webhook' }),
                        { status: 403, headers: { 'Content-Type': 'application/json' } }
                    )
                }

                const event = verification.event as { type: string; data: unknown }
                console.log(`[PolarWebhook] Received event: ${event.type}`)

                try {
                    // Handle checkout completion - this is the only event we need for crediting
                    if (isCheckoutCompleted(verification.event)) {
                        await handleCheckoutCompleted(verification.event)
                    } else if (event.type === 'order.refunded' || event.type === 'payment.refunded') {
                        await handleRefund(verification.event)
                    } else {
                        console.log(`[PolarWebhook] Unhandled event type: ${event.type}`)
                    }

                    // Always return 202 Accepted for webhooks
                    // This tells Polar we received it successfully
                    return new Response(JSON.stringify({ received: true }), {
                        status: 202,
                        headers: { 'Content-Type': 'application/json' },
                    })
                } catch (error) {
                    console.error('[PolarWebhook] Error processing webhook:', error)
                    // Still return 202 to prevent retries for application errors
                    // Log error for manual investigation
                    return new Response(JSON.stringify({ received: true, error: 'Processing logged' }), {
                        status: 202,
                        headers: { 'Content-Type': 'application/json' },
                    })
                }
            },
        },
    },
})

/**
 * Handle order.paid event
 * Grants credits based on the actual amount paid
 */
async function handleCheckoutCompleted(event: unknown) {
    const checkoutData = extractCheckoutData(event)

    if (!checkoutData) {
        console.error('[PolarWebhook] Could not extract checkout data:', event)
        throw new Error('Invalid checkout data in webhook')
    }

    const { checkoutId, amountCents, userId } = checkoutData

    if (!userId) {
        console.error('[PolarWebhook] Missing userId in checkout metadata:', checkoutData)
        throw new Error('Missing userId in checkout metadata')
    }

    if (!amountCents || amountCents <= 0) {
        console.error('[PolarWebhook] Invalid amount:', amountCents)
        throw new Error('Invalid checkout amount')
    }

    // Add credits via ledger (idempotent via reference check)
    const result = await addPurchaseCredits({
        userId,
        amountCents,
        reference: checkoutId,
        metadata: { event },
    })

    if (result.alreadyExists) {
        console.log(`[PolarWebhook] Checkout ${checkoutId} already processed, skipping`)
        return
    }

    console.log(
        `[PolarWebhook] Credits granted: ${result.creditsAdded} credits ` +
        `(from $${(amountCents / 100).toFixed(2)}) for user ${userId}. ` +
        `New balance: ${result.newBalance}`
    )
}

/**
 * Handle refund events
 * Records refund in ledger (deducts credits)
 */
async function handleRefund(event: unknown) {
    const checkoutData = extractCheckoutData(event)

    if (!checkoutData) {
        console.error('[PolarWebhook] Could not extract refund data:', event)
        throw new Error('Invalid refund data in webhook')
    }

    const { checkoutId, amountCents, userId } = checkoutData

    if (!userId) {
        console.error('[PolarWebhook] Missing userId in refund metadata:', checkoutData)
        throw new Error('Missing userId in refund metadata')
    }

    // Process refund via ledger (idempotent via reference check)
    // We use the checkout ID as reference so we can link back to the original purchase
    const result = await processRefund({
        userId,
        amount: Math.floor(amountCents / 100 * (parseInt(process.env.CREDITS_PER_DOLLAR || '1000', 10))),
        reference: checkoutId,
        metadata: { event },
    })

    if (result.alreadyRefunded) {
        console.log(`[PolarWebhook] Refund ${checkoutId} already processed, skipping`)
        return
    }

    console.log(
        `[PolarWebhook] Refund processed for checkout ${checkoutId}. ` +
        `New balance: ${result.newBalance}`
    )
}
