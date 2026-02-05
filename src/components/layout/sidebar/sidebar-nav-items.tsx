import { memo } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui'
import { navItems, type NavItem } from './nav-items'

interface SidebarNavItemsProps {
    onNavClick: (item: NavItem) => void
    isCollapsed?: boolean
}

/**
 * Shared navigation items component for sidebars
 */
export const SidebarNavItems = memo(function SidebarNavItems({
    onNavClick,
    isCollapsed = false
}: SidebarNavItemsProps) {
    return (
        <>
            {navItems.map((item) => {
                const Icon = item.icon
                const isNewChat = 'action' in item && item.action === 'newChat'

                const button = (
                    <button
                        onClick={() => onNavClick(item)}
                        className={cn(
                            'flex items-center gap-3 w-full rounded-lg transition-colors text-xs',
                            isCollapsed ? 'justify-center p-2' : 'px-3 py-2',
                            isNewChat
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                    >
                        <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                )

                return isCollapsed ? (
                    <Tooltip key={item.label} content={item.label} side="right">
                        {button}
                    </Tooltip>
                ) : (
                    <div key={item.label}>{button}</div>
                )
            })}
        </>
    )
})
