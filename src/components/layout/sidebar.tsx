import { useCallback } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { Logo } from '@/components/logo'
import { Tooltip, Separator, Avatar, AvatarFallback, ScrollArea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Settings } from 'lucide-react'
import { SidebarNavItems, SidebarChatList, ThemeToggle, type NavItem } from './sidebar/index'

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const { isSidebarOpen, chats, activeChat, setActiveChat, createChat } = useChatStore()

    const handleNavClick = useCallback((item: NavItem) => {
        if ('action' in item && item.action === 'newChat') {
            createChat()
        }
    }, [createChat])

    const handleChatSelect = useCallback((chatId: string) => {
        setActiveChat(chatId)
    }, [setActiveChat])

    return (
        <aside
            data-state={isSidebarOpen ? 'expanded' : 'collapsed'}
            className={cn(
                'group flex flex-col h-full bg-card border-r border-border shrink-0 transition-all duration-200 ease-in-out',
                isSidebarOpen ? 'w-56' : 'w-14',
                className
            )}
        >
            <div className={cn("flex items-center justify-center h-14 px-3 shrink-0", isSidebarOpen ? 'justify-start pl-4' : 'justify-center')}>
                <Logo collapsed={!isSidebarOpen} className="text-base" />
            </div>

            <Separator />

            <nav className="flex flex-col gap-1 p-2">
                <SidebarNavItems onNavClick={handleNavClick} isCollapsed={!isSidebarOpen} />
            </nav>

            <Separator className="mx-2" />

            <div className="flex-1 flex flex-col overflow-hidden">
                {isSidebarOpen && (
                    <div className="px-3 py-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Recent
                        </span>
                    </div>
                )}
                <ScrollArea className="flex-1 px-2 overflow-x-hidden">
                    <SidebarChatList
                        chats={chats}
                        activeChat={activeChat}
                        onChatSelect={handleChatSelect}
                        isCollapsed={!isSidebarOpen}
                    />
                </ScrollArea>
            </div>

            <Separator />

            <div className="flex flex-col gap-1 p-2 shrink-0">
                <SidebarButton
                    icon={<ThemeToggle showLabel={isSidebarOpen} />}
                    isCollapsed={!isSidebarOpen}
                    tooltipContent="Theme"
                    isCustom
                />
                <SidebarButton
                    icon={<Settings size={16} strokeWidth={1.75} className="shrink-0" />}
                    label="Settings"
                    isCollapsed={!isSidebarOpen}
                    tooltipContent="Settings"
                />
                <ProfileButton isCollapsed={!isSidebarOpen} />
            </div>
        </aside>
    )
}

interface SidebarButtonProps {
    icon: React.ReactNode
    label?: string
    isCollapsed: boolean
    tooltipContent: string
    onClick?: () => void
    isCustom?: boolean
}

function SidebarButton({ icon, label, isCollapsed, tooltipContent, onClick, isCustom }: SidebarButtonProps) {
    if (isCustom) {
        // For custom components like ThemeToggle that render their own button
        return isCollapsed ? (
            <Tooltip content={tooltipContent} side="right">
                <div>{icon}</div>
            </Tooltip>
        ) : (
            <div>{icon}</div>
        )
    }

    const button = (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-3 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs',
                isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
            )}
        >
            {icon}
            {!isCollapsed && label && <span>{label}</span>}
        </button>
    )

    return isCollapsed ? (
        <Tooltip content={tooltipContent} side="right">
            {button}
        </Tooltip>
    ) : button
}

function ProfileButton({ isCollapsed }: { isCollapsed: boolean }) {
    const button = (
        <button
            className={cn(
                'flex items-center gap-3 w-full rounded-lg hover:bg-muted transition-colors',
                isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
            )}
        >
            <Avatar className="h-7 w-7 ring-2 ring-amber-400/50 shrink-0">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-amber-100 to-orange-200 text-amber-800">
                    U
                </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
                <div className="flex-1 text-left">
                    <p className="text-[10px] font-medium truncate">User</p>
                    <p className="text-[10px] text-muted-foreground truncate">Free Plan</p>
                </div>
            )}
        </button>
    )

    return isCollapsed ? (
        <Tooltip content="Profile" side="right">
            {button}
        </Tooltip>
    ) : button
}
