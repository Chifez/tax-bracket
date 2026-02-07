import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useChatStore } from '@/stores/chat-store'
import { Logo } from '@/components/logo'
import { Button, Separator, ScrollArea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { LogOut, MessageSquare, Settings, X } from 'lucide-react'
import { navItems, type NavItem, ThemeToggle, ProfileDropdown, SidebarButton } from './sidebar/index'
import { useUser, useLogout } from '@/hooks/use-auth'

interface MobileSidebarProps {
    isOpen: boolean
    onClose: () => void
    onNavAction?: (action: string) => void

}

import { useChats, useCreateChat } from '@/hooks/use-chat'

// ...

export function MobileSidebar({ isOpen, onClose, onNavAction }: MobileSidebarProps) {
    const { activeChat, setActiveChat } = useChatStore()
    const { mutate: createChat } = useCreateChat()
    const { data: chatsData } = useChats()
    const chats = chatsData?.chats ?? []

    const { data } = useUser()
    const { mutate: logout } = useLogout()
    const user = data?.user
    const navigate = useNavigate()

    const handleNavClick = useCallback((item: NavItem) => {
        if ('action' in item && item.action === 'newChat') {
            createChat({}, {
                onSuccess: (data) => {
                    navigate({ to: '/chats/$chatId', params: { chatId: data.chat.id } })
                }
            })
            onClose()
            return
        } else if (onNavAction) {
            const action = 'action' in item ? item.action : item.href
            onNavAction(action)
        }
        onClose()
    }, [createChat, onClose, onNavAction, navigate])

    const handleChatSelect = useCallback((chatId: string) => {
        setActiveChat(chatId)
        onClose()
    }, [setActiveChat, onClose])

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-[70vw] max-w-[300px] border-r border-border flex flex-col',
                    'transition-transform duration-300 ease-out',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ backgroundColor: 'var(--card)' }}
            >
                <div className="flex items-center justify-between h-14 px-4 shrink-0">
                    <Logo className="text-lg" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <X size={18} />
                    </Button>
                </div>

                <Separator />

                <nav className="flex flex-col gap-1.5 p-3">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isNewChat = 'action' in item && item.action === 'newChat'

                        return (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item)}
                                className={cn(
                                    'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 transition-colors text-sm',
                                    isNewChat
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                            >
                                <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <Separator />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Recent Chats
                        </span>
                    </div>
                    <ScrollArea className="flex-1 px-3">
                        <div className="flex flex-col gap-1 pb-3">
                            {chats.slice(0, 10).map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => handleChatSelect(chat.id)}
                                    className={cn(
                                        'flex items-center gap-3 w-full rounded-lg px-3 py-2 transition-colors text-sm',
                                        activeChat === chat.id
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    )}
                                >
                                    <MessageSquare size={16} strokeWidth={1.5} className="shrink-0" />
                                    <span className="truncate text-left flex-1">{chat.title}</span>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <Separator />


                <div className="flex flex-col gap-1 p-2 shrink-0">
                    <SidebarButton

                        tooltip="Theme"
                        asChild
                    >
                        <ThemeToggle showLabel />
                    </SidebarButton>

                    <SidebarButton
                        tooltip="Settings"
                        icon={<Settings size={16} strokeWidth={1.75} className="shrink-0" />}
                        onClick={() => user && navigate({ to: '/settings' })}
                        className={cn(!user && "opacity-50 cursor-default")}
                    >
                        Settings
                    </SidebarButton>

                    {user && (
                        <SidebarButton
                            tooltip="Logout"
                            icon={<LogOut size={16} strokeWidth={1.75} className="shrink-0" />}
                            onClick={() => logout()}
                        >
                            Logout
                        </SidebarButton>
                    )}
                    <ProfileDropdown
                        user={user}
                        side="top"
                    />
                </div>
            </aside>
        </>
    )
}
