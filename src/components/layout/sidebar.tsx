import { useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useChatStore } from '@/stores/chat-store'
import { Logo } from '@/components/logo'
import { Separator, ScrollArea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Settings, LogOut } from 'lucide-react'
import { SidebarNavItems, SidebarChatList, ThemeToggle, SidebarButton, type NavItem, ProfileDropdown } from './sidebar/index'
import { useUser, useLogout } from '@/hooks/use-auth'
import { useChats } from '@/hooks/use-chat'


interface SidebarProps {
    className?: string
    onNavAction?: (action: string) => void

}

export function Sidebar({ className, onNavAction }: SidebarProps) {
    const { isSidebarOpen } = useChatStore()
    const params = useParams({ strict: false }) as { chatId?: string }
    const activeChat = params.chatId || null

    const { data: chatsData } = useChats()
    const chats = chatsData?.chats ?? []

    const { data } = useUser()
    const { mutate: logout } = useLogout()
    const navigate = useNavigate()
    const user = data?.user

    const handleNavClick = useCallback((item: NavItem) => {
        if ('action' in item && item.action === 'newChat') {
            // Just navigate to root - the home route's useEffect will clear activeChat
            navigate({ to: '/' })
            return
        }

        if (onNavAction) {
            const action = 'action' in item ? item.action : item.href
            onNavAction(action)
        }
    }, [onNavAction, navigate])

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
                        isCollapsed={!isSidebarOpen}
                    />
                </ScrollArea>
            </div>

            <Separator />

            <div className="flex-col gap-1 p-2 shrink-0 flex">
                <SidebarButton
                    isCollapsed={!isSidebarOpen}
                    tooltip="Theme"
                    asChild
                >
                    <ThemeToggle showLabel={isSidebarOpen} />
                </SidebarButton>

                <SidebarButton
                    isCollapsed={!isSidebarOpen}
                    tooltip="Settings"
                    onClick={() => user && navigate({ to: '/settings' })}
                    icon={<Settings size={16} strokeWidth={1.75} className="shrink-0" />}
                    className={cn(!user && "opacity-50 cursor-default")}
                >
                    Settings
                </SidebarButton>

                {user && (
                    <SidebarButton
                        isCollapsed={!isSidebarOpen}
                        tooltip="Logout"
                        icon={<LogOut size={16} strokeWidth={1.75} className="shrink-0" />}
                        onClick={() => {
                            logout()
                            navigate({ to: '/' })
                        }}
                    >
                        Logout
                    </SidebarButton>
                )}
                <ProfileDropdown
                    isCollapsed={!isSidebarOpen}
                    user={user}
                    side="right"
                />

            </div>
        </aside>
    )
}
