import { cn } from '@/lib/utils'

interface LogoProps {
    collapsed?: boolean
    className?: string
}

export function Logo({ collapsed = false, className }: LogoProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center font-mono font-bold text-primary transition-all duration-200',
                collapsed ? 'text-lg' : 'text-xl',
                className
            )}
        >
            <span className="text-primary-600 dark:text-primary-400">{'{'}</span>
            {!collapsed && (
                <span className="mx-0.5 text-foreground">TAX</span>
            )}
            <span className="text-primary-600 dark:text-primary-400">{'}'}</span>
        </div>
    )
}
