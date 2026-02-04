import { cn } from '@/lib/utils'

interface ThinkingAnimationProps {
    className?: string
}

/**
 * AI thinking/processing indicator with animated logo
 * Shows pulsing brackets animation while AI is processing
 */
export function ThinkingAnimation({ className }: ThinkingAnimationProps) {
    return (
        <div className={cn('flex items-start gap-3', className)}>
            <div className="flex items-center gap-2">
                {/* Animated Logo */}
                <div className="relative">
                    <div className="flex items-center animate-pulse">
                        <span className="text-xs font-bold text-primary animate-bounce" style={{ animationDelay: '0ms' }}>
                            {'{'}
                        </span>
                        {/* <span className="text-xs font-bold text-primary/80 animate-pulse" style={{ animationDelay: '150ms' }}>
                            TAX
                        </span> */}
                        <span className="text-xs font-bold text-primary animate-bounce" style={{ animationDelay: '300ms' }}>
                            {'}'}
                        </span>
                    </div>
                </div>

                {/* Status Text */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Analyzing</span>
                    <span className="inline-flex gap-0.5">
                        <span className="size-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="size-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="size-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                </div>
            </div>
        </div>
    )
}

/**
 * Simplified thinking indicator (just dots)
 */
export function ThinkingDots({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center gap-1', className)}>
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    )
}
