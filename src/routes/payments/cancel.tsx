import { createFileRoute, Link } from '@tanstack/react-router'
import { XCircle, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/payments/cancel')({
    component: PaymentCancelPage,
})

function PaymentCancelPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">Payment Cancelled</h1>
                    <p className="text-muted-foreground">
                        Your payment was cancelled. No charges have been made to your account.
                    </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                        You can try again at any time. Your credits will be added instantly once payment is complete.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to TaxBracket
                    </Link>
                </div>
            </div>
        </div>
    )
}
