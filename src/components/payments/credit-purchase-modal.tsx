import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useCreditCheckout, useCreditPricing } from '@/hooks/use-payments'
import { Zap, Loader2, ArrowRight, Sparkles, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditPurchaseModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreditPurchaseModal({ open, onOpenChange }: CreditPurchaseModalProps) {
    const { data: pricing } = useCreditPricing()
    const { createCheckoutAsync, isCreating, error } = useCreditCheckout()

    const handlePurchase = async () => {
        try {
            const result = await createCheckoutAsync()
            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl
            }
        } catch (e) {
            console.error('Failed to create checkout:', e)
        }
    }

    const creditsPerDollar = pricing?.creditsPerDollar || 1000
    const tokensPerCredit = pricing?.tokensPerCredit || 10

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Buy Credits
                    </DialogTitle>
                    <DialogDescription>
                        Purchase credits to continue using AI analysis. Choose how much to pay.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Pricing info */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Rate</span>
                            <span className="font-semibold text-primary flex items-center gap-1">
                                <Zap className="w-4 h-4" />
                                {creditsPerDollar.toLocaleString()} credits / $1
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">AI Tokens per credit</span>
                            <span className="font-medium">{tokensPerCredit}</span>
                        </div>
                        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                            Example: $5 = {(5 * creditsPerDollar).toLocaleString()} credits = ~{(5 * creditsPerDollar * tokensPerCredit).toLocaleString()} tokens
                        </p>
                    </div>

                    {/* Pay what you want explanation */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-1">Pay What You Want</h4>
                        <p className="text-xs text-muted-foreground">
                            You'll choose how much to pay on the checkout page. 
                            Minimum purchase is $1. Credits never expire.
                        </p>
                    </div>

                    {/* Purchase button */}
                    <button
                        onClick={handlePurchase}
                        disabled={isCreating}
                        className={cn(
                            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
                            'bg-primary text-primary-foreground hover:bg-primary/90',
                            isCreating && 'opacity-70 cursor-not-allowed'
                        )}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Opening checkout...
                            </>
                        ) : (
                            <>
                                Continue to Checkout
                                <ExternalLink className="w-4 h-4" />
                            </>
                        )}
                    </button>

                    {error && (
                        <p className="text-sm text-red-500 text-center">
                            Failed to open checkout. Please try again.
                        </p>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                        Secure payment via Polar
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
