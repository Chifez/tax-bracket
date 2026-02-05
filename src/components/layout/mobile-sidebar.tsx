import { useChatStore } from '@/stores/chat-store'
import { useThemeStore } from '@/stores/theme-store'
import { Logo } from '@/components/logo'
import { Button, Separator, Avatar, AvatarFallback, ScrollArea } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
    Home,
    Plus,
    Upload,
    BarChart3,
    Settings,
    Sun,
    Moon,
    Monitor,
    MessageSquare,
    X,
} from 'lucide-react'

interface MobileSidebarProps {
    isOpen: boolean
    onClose: () => void
}

const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Plus, label: 'New Chat', action: 'newChat' },
    { icon: Upload, label: 'Upload', href: '/upload' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
] as const

/**
 * Mobile Sidebar - Drawer-style sidebar for mobile devices
 * Slides in from left with backdrop overlay
 */
export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const { chats, activeChat, setActiveChat, createChat } = useChatStore()
    const { theme, setTheme } = useThemeStore()

    const handleNavClick = (item: typeof navItems[number]) => {
        if ('action' in item && item.action === 'newChat') {
            createChat()
        }
        onClose()
    }

    const handleChatSelect = (chatId: string) => {
        setActiveChat(chatId)
        onClose()
    }

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
    }

    const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-[70vw] max-w-[300px] bg-card border-r border-border flex flex-col',
                    'transition-transform duration-300 ease-out',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Header */}
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

                {/* Primary Nav */}
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
                                <Icon size={18} strokeWidth={1.5} />
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <Separator className="mx-3" />

                {/* Recent Chats */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Recent
                        </span>
                    </div>
                    <ScrollArea className="flex-1 px-3">
                        <div className="flex flex-col gap-1 pb-3">
                            {chats.slice(0, 15).map((chat) => (
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

                {/* Bottom Section */}
                <div className="flex flex-col gap-1 p-3 shrink-0">
                    {/* Theme Toggle */}
                    <button
                        onClick={cycleTheme}
                        className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
                    >
                        <ThemeIcon size={18} strokeWidth={1.75} />
                        <span className="capitalize">{theme}</span>
                    </button>

                    {/* Settings */}
                    <button
                        className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
                    >
                        <Settings size={18} strokeWidth={1.75} />
                        <span>Settings</span>
                    </button>

                    {/* User Profile */}
                    <button
                        className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                    >
                        <Avatar className="h-8 w-8 ring-2 ring-amber-400/50">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-amber-100 to-orange-200 text-amber-800">
                                U
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium">User</p>
                            <p className="text-xs text-muted-foreground">Free Plan</p>
                        </div>
                    </button>
                </div>
            </aside>
        </>
    )
}
