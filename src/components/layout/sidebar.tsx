import { useChatStore } from '@/stores/chat-store'
import { useThemeStore } from '@/stores/theme-store'
import { Logo } from '@/components/logo'
import { Button, Tooltip, Separator, Avatar, AvatarFallback, ScrollArea } from '@/components/ui'
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
} from 'lucide-react'

interface SidebarProps {
    className?: string
}

const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Plus, label: 'New Chat', action: 'newChat' },
    { icon: Upload, label: 'Upload', href: '/upload' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
] as const

export function Sidebar({ className }: SidebarProps) {
    const { isSidebarOpen, chats, activeChat, setActiveChat, createChat } = useChatStore()
    const { theme, setTheme } = useThemeStore()

    const handleNavClick = (item: typeof navItems[number]) => {
        if ('action' in item && item.action === 'newChat') {
            createChat()
        }
    }

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
    }

    const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

    return (
        <aside
            data-state={isSidebarOpen ? 'expanded' : 'collapsed'}
            className={cn(
                'group flex flex-col h-full bg-card border-r border-border shrink-0 transition-all duration-200 ease-in-out',
                isSidebarOpen ? 'w-56' : 'w-14',
                className
            )}
        >
            {/* Header with Logo */}
            <div className={cn("flex items-center justify-center h-14 px-3 shrink-0", isSidebarOpen ? 'justify-start pl-4' : 'justify-center')}>
                <Logo collapsed={!isSidebarOpen} className="text-base" />
            </div>

            <Separator />

            {/* Primary Nav */}
            <nav className="flex flex-col gap-1 p-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isNewChat = 'action' in item && item.action === 'newChat'

                    const button = (
                        <button
                            onClick={() => handleNavClick(item)}
                            className={cn(
                                'flex items-center gap-3 w-full rounded-lg transition-colors text-xs',
                                isSidebarOpen ? 'px-3 py-2' : 'justify-center p-2',
                                isNewChat
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}
                        >
                            <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                            {isSidebarOpen && <span className="truncate">{item.label}</span>}
                        </button>
                    )

                    return isSidebarOpen ? (
                        <div key={item.label}>{button}</div>
                    ) : (
                        <Tooltip key={item.label} content={item.label} side="right">
                            {button}
                        </Tooltip>
                    )
                })}
            </nav>

            <Separator className="mx-2" />

            {/* Recent Chats */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {isSidebarOpen && (
                    <div className="px-3 py-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Recent
                        </span>
                    </div>
                )}
                <ScrollArea className="flex-1 px-2 overflow-x-hidden">
                    <div className="flex flex-col gap-1 pb-2">
                        {chats.slice(0, 10).map((chat) => {
                            const button = (
                                <button
                                    onClick={() => setActiveChat(chat.id)}
                                    className={cn(
                                        'flex items-center gap-3 w-full rounded-lg transition-colors text-xs',
                                        isSidebarOpen ? 'px-3 py-2' : 'justify-center p-2',
                                        activeChat === chat.id
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    )}
                                >
                                    <MessageSquare size={16} strokeWidth={1.5} className="shrink-0" />
                                    {isSidebarOpen && (
                                        <span className="truncate text-left flex-1">{chat.title}</span>
                                    )}
                                </button>
                            )

                            return isSidebarOpen ? (
                                <div key={chat.id}>{button}</div>
                            ) : (
                                <Tooltip key={chat.id} content={chat.title} side="right">
                                    {button}
                                </Tooltip>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>

            <Separator />

            {/* Bottom Section */}
            <div className="flex flex-col gap-1 p-2 shrink-0">
                {/* Theme Toggle */}
                {(() => {
                    const themeButton = (
                        <button
                            onClick={cycleTheme}
                            className={cn(
                                'flex items-center gap-3 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs',
                                isSidebarOpen ? 'px-3 py-2' : 'justify-center p-2'
                            )}
                        >
                            <ThemeIcon size={16} strokeWidth={1.75} className="shrink-0" />
                            {isSidebarOpen && <span className="capitalize">{theme}</span>}
                        </button>
                    )

                    return isSidebarOpen ? themeButton : (
                        <Tooltip content={`Theme: ${theme}`} side="right">
                            {themeButton}
                        </Tooltip>
                    )
                })()}

                {/* Settings */}
                {(() => {
                    const settingsButton = (
                        <button
                            className={cn(
                                'flex items-center gap-3 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs',
                                isSidebarOpen ? 'px-3 py-2' : 'justify-center p-2'
                            )}
                        >
                            <Settings size={16} strokeWidth={1.75} className="shrink-0" />
                            {isSidebarOpen && <span>Settings</span>}
                        </button>
                    )

                    return isSidebarOpen ? settingsButton : (
                        <Tooltip content="Settings" side="right">
                            {settingsButton}
                        </Tooltip>
                    )
                })()}

                {/* User Profile */}
                {(() => {
                    const profileButton = (
                        <button
                            className={cn(
                                'flex items-center gap-3 w-full rounded-lg hover:bg-muted transition-colors',
                                isSidebarOpen ? 'px-3 py-2' : 'justify-center p-2'
                            )}
                        >
                            <Avatar className="h-7 w-7 ring-2 ring-amber-400/50 shrink-0">
                                <AvatarFallback className="text-[10px] bg-gradient-to-br from-amber-100 to-orange-200 text-amber-800">
                                    U
                                </AvatarFallback>
                            </Avatar>
                            {isSidebarOpen && (
                                <div className="flex-1 text-left">
                                    <p className="text-[10px] font-medium truncate">User</p>
                                    <p className="text-[10px] text-muted-foreground truncate">Free Plan</p>
                                </div>
                            )}
                        </button>
                    )

                    return isSidebarOpen ? profileButton : (
                        <Tooltip content="Profile" side="right">
                            {profileButton}
                        </Tooltip>
                    )
                })()}
            </div>
        </aside>
    )
}
