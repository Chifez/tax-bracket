import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPurchase } from '@/server/functions/payments'
import { CheckCircle, ArrowLeft, Zap, Loader2, Clock } from 'lucide-react'
import { z } from 'zod'
import { useEffect } from 'react'

const searchSchema = z.object({
    // Polar redirects with checkout_id or checkout_session_id
    checkout_id: z.string().optional(),
    checkout_session_id: z.string().optional(),
    // Legacy support
    purchase_id: z.string().optional(),
})

export const Route = createFileRoute('/payments/success')({
    validateSearch: searchSchema,
    component: PaymentSuccessPage,
})

function PaymentSuccessPage() {
    const queryClient = useQueryClient()
    const search = Route.useSearch()
    
    // Get the reference - Polar may use different param names
    const reference = search.checkout_id || search.checkout_session_id || search.purchase_id

    const { data: purchase, error, refetch } = useQuery({
        queryKey: ['purchase', reference],
        queryFn: () => getPurchase({ data: { reference: reference! } }),
        enabled: !!reference,
        // Poll every 2 seconds if not found yet (webhook may not have processed)
        refetchInterval: (query) => {
            if (!query.state.data) return 2000
            return false
        },
        // Keep trying for up to 30 seconds
        retry: 15,
        retryDelay: 2000,
    })

    // Invalidate credits query when purchase is found
    useEffect(() => {
        if (purchase) {
            queryClient.invalidateQueries({ queryKey: ['credits'] })
        }
    }, [purchase, queryClient])

    // Waiting for webhook state
    const isWaitingForWebhook = !!reference && !purchase && !error

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Success icon or loading */}
                <div className="flex justify-center">
                    {isWaitingForWebhook ? (
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : purchase ? (
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-yellow-500" />
                        </div>
                    )}
                </div>

                {/* Status message */}
                <div className="space-y-2">
                    {isWaitingForWebhook ? (
                        <>
                            <h1 className="text-2xl font-semibold">Processing Payment...</h1>
                            <p className="text-muted-foreground">
                                Your payment is being processed. This usually takes just a few seconds.
                            </p>
                        </>
                    ) : purchase ? (
                        <>
                            <h1 className="text-2xl font-semibold">Payment Successful!</h1>
                            <p className="text-muted-foreground">
                                Thank you for your purchase. Your credits have been added to your account.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-semibold">Payment Received</h1>
                            <p className="text-muted-foreground">
                                Your payment was received. If you don't see your credits soon, please contact support.
                            </p>
                        </>
                    )}
                </div>

                {/* Purchase details */}
                {purchase && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-center gap-2">
                            <Zap className="w-5 h-5 text-primary" />
                            <span className="text-lg font-semibold">
                                +{purchase.creditsPurchased.toLocaleString()} Credits
                            </span>
                        </div>
                        {purchase.amountUsd > 0 && (
                            <div className="text-sm text-muted-foreground">
                                Amount paid: ${purchase.amountUsd.toFixed(2)} USD
                            </div>
                        )}
                    </div>
                )}

                {/* Loading indicator when waiting */}
                {isWaitingForWebhook && (
                    <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Confirming your purchase...</span>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && !isWaitingForWebhook && (
                    <div className="bg-yellow-500/10 text-yellow-600 rounded-lg p-4">
                        <p className="text-sm">
                            We couldn't verify your purchase yet. Your credits may take a moment to appear.
                        </p>
                        <button
                            onClick={() => refetch()}
                            className="mt-2 text-xs underline hover:no-underline"
                        >
                            Check again
                        </button>
                    </div>
                )}

                {/* Back button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to TaxBracket
                </Link>
            </div>
        </div>
    )
}
