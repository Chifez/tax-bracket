import { useState } from 'react'
import { Zap, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCredits } from '@/hooks/use-credits'
import { Tooltip } from '@/components/ui'
import { CreditPurchaseModal } from '@/components/payments'

interface CreditDisplayProps {
    isCollapsed?: boolean
    className?: string
}

export function CreditDisplay({ isCollapsed = false, className }: CreditDisplayProps) {
    const { data: credits, isLoading } = useCredits()
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)

    if (isLoading || !credits) {
        return null
    }

    const percentageRemaining = 100 - credits.percentageUsed
    const isLow = percentageRemaining <= 50
    const isCritical = percentageRemaining <= 5
    const showBuyButton = credits.purchaseEnabled && (isLow || isCritical)

    const getStatusColor = () => {
        if (isCritical) return 'text-red-500'
        if (isLow) return 'text-yellow-500'
        return 'text-green-500'
    }

    const getProgressColor = () => {
        if (isCritical) return 'bg-red-500'
        if (isLow) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const formatResetTime = () => {
        if (credits.daysUntilReset > 1) {
            return `${credits.daysUntilReset} days`
        }
        if (credits.hoursUntilReset > 1) {
            return `${credits.hoursUntilReset} hours`
        }
        return 'Soon'
    }

    const tooltipContent = isCollapsed ? (
        <div className="space-y-1">
            <div className="font-medium">
                {credits.remaining.toLocaleString()} / {credits.effectiveLimit.toLocaleString()} credits
            </div>
            <div className="text-muted-foreground">
                {credits.weeklyResetEnabled ? `Resets in ${formatResetTime()}` : 'Purchased credits never expire'}
            </div>
            {credits.purchasedCredits > 0 && (
                <div className="text-xs text-primary">
                    +{credits.purchasedCredits.toLocaleString()} purchased credits
                </div>
            )}
        </div>
    ) : (
        <div className="space-y-1">
            <div>
                <span className="font-medium">{credits.used.toLocaleString()}</span> credits used this week
            </div>
            {credits.purchasedCredits > 0 && (
                <div className="text-primary">
                    +{credits.purchasedCredits.toLocaleString()} purchased credits
                </div>
            )}
            <div className="text-muted-foreground">
                {credits.weeklyResetEnabled
                    ? `Resets in ${formatResetTime()} (Monday 00:00 UTC)`
                    : 'Purchased credits never expire'}
            </div>
            {credits.purchaseEnabled && (
                <div className="text-xs text-primary pt-1">
                    Click to buy more credits
                </div>
            )}
        </div>
    )

    return (
        <>
            <Tooltip content={tooltipContent} side="right">
                <div
                    onClick={() => credits.purchaseEnabled && setShowPurchaseModal(true)}
                    className={cn(
                        'flex items-center gap-1 px-2 py-1.5 rounded-md w-full',
                        'hover:bg-muted/50 transition-colors',
                        credits.purchaseEnabled ? 'cursor-pointer' : 'cursor-default',
                        className
                    )}
                >
                    <Zap size={16} strokeWidth={1.5} className={cn('shrink-0', isCollapsed ? 'mx-1' : 'mx-1.5', getStatusColor())} />

                    {!isCollapsed && (
                        <>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Credits</span>
                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn('h-full transition-all duration-300', getProgressColor())}
                                    style={{ width: `${percentageRemaining}%` }}
                                />
                            </div>
                            <span className={cn('text-xs font-medium whitespace-nowrap', getStatusColor())}>
                                {credits.remaining.toLocaleString()}
                            </span>
                            {showBuyButton && (
                                <Plus size={14} className="text-primary ml-1" />
                            )}
                        </>
                    )}
                </div>
            </Tooltip>

            <CreditPurchaseModal
                open={showPurchaseModal}
                onOpenChange={setShowPurchaseModal}
            />
        </>
    )
}