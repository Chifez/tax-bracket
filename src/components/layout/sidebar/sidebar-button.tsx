import { Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface SidebarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode
    isCollapsed?: boolean
    tooltip?: string
    isActive?: boolean
    asChild?: boolean
}

export const SidebarButton = forwardRef<HTMLButtonElement, SidebarButtonProps>(
    ({ className, icon, children, isCollapsed, tooltip, isActive, asChild, ...props }, ref) => {
        if (asChild) {
            const content = (
                <div className={cn(isCollapsed ? 'flex justify-center' : '', className)}>
                    {children}
                </div>
            )

            if (isCollapsed && tooltip) {
                return (
                    <Tooltip content={tooltip} side="right">
                        {content}
                    </Tooltip>
                )
            }
            return content
        }

        const button = (
            <button
                ref={ref}
                className={cn(
                    'flex items-center gap-3 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs',
                    isActive && 'bg-muted text-foreground',
                    isCollapsed ? 'justify-center p-2' : 'px-3 py-2',
                    className
                )}
                {...props}
            >
                {icon}
                {!isCollapsed && children && <span>{children}</span>}
            </button>
        )

        if (isCollapsed && tooltip) {
            return (
                <Tooltip content={tooltip} side="right">
                    {button}
                </Tooltip>
            )
        }

        return button
    }
)
SidebarButton.displayName = 'SidebarButton'
