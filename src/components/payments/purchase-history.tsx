import { useQuery } from '@tanstack/react-query'
import { getPurchaseHistory } from '@/server/functions/payments'
import { Zap, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PurchaseHistory() {
    const { data: purchases, isLoading, error } = useQuery({
        queryKey: ['purchase-history'],
        queryFn: () => getPurchaseHistory(),
    })

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-muted/50 rounded-lg p-4 h-16" />
                ))}
            </div>
        )
    }

    if (error || !purchases) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Failed to load purchase history
            </div>
        )
    }

    if (purchases.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No purchases yet</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {purchases.map((purchase: { id: string; creditsPurchased: number; createdAt: string; amountUsd: number; status: string }) => (
                <div
                    key={purchase.id}
                    className="flex items-center justify-between bg-muted/50 rounded-lg p-4"
                >
                    <div className="flex items-center gap-3">
                        <StatusIcon status={purchase.status} />
                        <div>
                            <p className="font-medium">
                                +{purchase.creditsPurchased.toLocaleString()} credits
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {new Date(purchase.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-medium">${purchase.amountUsd.toFixed(2)}</p>
                        <p className={cn(
                            'text-xs capitalize',
                            purchase.status === 'completed' && 'text-green-500',
                            purchase.status === 'pending' && 'text-yellow-500',
                            purchase.status === 'failed' && 'text-red-500',
                            purchase.status === 'refunded' && 'text-muted-foreground',
                        )}>
                            {purchase.status}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'completed':
            return <CheckCircle className="w-5 h-5 text-green-500" />
        case 'pending':
            return <Clock className="w-5 h-5 text-yellow-500" />
        case 'failed':
            return <XCircle className="w-5 h-5 text-red-500" />
        case 'refunded':
            return <RefreshCw className="w-5 h-5 text-muted-foreground" />
        default:
            return <Zap className="w-5 h-5 text-primary" />
    }
}
