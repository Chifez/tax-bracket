import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'
import { useChatStore } from '@/stores/chat-store'
import { useIsMobile } from '@/hooks'
import { Button, Avatar, AvatarFallback } from '@/components/ui'
import { PanelLeft, PanelLeftClose, Menu, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthModal } from '@/components/auth/auth-modal'
import { useUser } from '@/hooks/use-auth'

interface AppShellProps {
    children: React.ReactNode
    className?: string
}

export function AppShell({ children, className }: AppShellProps) {
    const { isSidebarOpen, toggleSidebar } = useChatStore()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [hasMounted, setHasMounted] = useState(false)
    const isMobile = useIsMobile()
    const { data } = useUser()
    const user = data?.user


    useEffect(() => {
        setHasMounted(true)
    }, [])


    const showDesktopSidebar = hasMounted && !isMobile
    const showMobileSidebar = hasMounted && isMobile

    return (
        <div className={cn('flex h-dvh overflow-hidden', className)}>
            {showDesktopSidebar && <Sidebar />}

            {showMobileSidebar && (
                <MobileSidebar
                    isOpen={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                />
            )}

            {hasMounted && (
                <>
                    <div className="relative pointer-events-none">
                        {isMobile ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMobileMenuOpen(true)}
                                className="fixed top-3 left-3 h-9 w-9 bg-card/90 backdrop-blur text-foreground hover:bg-card z-30 shadow-sm border border-border/50 pointer-events-auto"
                            >
                                <Menu size={18} />
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="absolute top-4 left-6 h-6 w-6 text-muted-foreground hover:text-foreground z-10 pointer-events-auto"
                            >
                                {isSidebarOpen ? (
                                    <PanelLeftClose size={16} />
                                ) : (
                                    <PanelLeft size={16} />
                                )}
                            </Button>
                        )}
                    </div>

                    <div className="fixed top-4 right-6 z-30">
                        {user ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all bg-background"
                                onClick={() => {
                                    // TODO: Open user menu
                                }}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {user.name?.slice(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAuthModalOpen(true)}
                                className="bg-card text-muted-foreground hover:text-foreground z-10 pointer-events-auto"
                            >
                                <LogIn size={14} className="mr-2" />
                                <p className="text-xs">Login</p>
                            </Button>
                        )}
                    </div>

                    <AuthModal
                        isOpen={authModalOpen}
                        onClose={() => setAuthModalOpen(false)}
                    />
                </>
            )}

            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
