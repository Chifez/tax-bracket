import { useCallback } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { Logo } from '@/components/logo'
import { Button, Separator, Avatar, AvatarFallback, ScrollArea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Settings, MessageSquare, X } from 'lucide-react'
import { navItems, type NavItem, ThemeToggle } from './sidebar/index'

interface MobileSidebarProps {
    isOpen: boolean
    onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const { chats, activeChat, setActiveChat, createChat } = useChatStore()

    const handleNavClick = useCallback((item: NavItem) => {
        if ('action' in item && item.action === 'newChat') {
            createChat()
        }
        onClose()
    }, [createChat, onClose])

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
                    'fixed inset-y-0 left-0 z-50 w-[70vw] max-w-[300px] bg-card border-r border-border flex flex-col',
                    'transition-transform duration-300 ease-out',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
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

                <div className="flex flex-col gap-1 p-3 shrink-0">
                    <ThemeToggle showLabel className="justify-start px-3 py-2.5" />

                    <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm">
                        <Settings size={18} strokeWidth={1.5} className="shrink-0" />
                        <span>Settings</span>
                    </button>

                    <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 hover:bg-muted transition-colors">
                        <Avatar className="h-8 w-8 ring-2 ring-amber-400/50 shrink-0">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-amber-100 to-orange-200 text-amber-800">
                                U
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium truncate">User</p>
                            <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                        </div>
                    </button>
                </div>
            </aside>
        </>
    )
}
