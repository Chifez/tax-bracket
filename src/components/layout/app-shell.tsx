import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'
import { useChatStore } from '@/stores/chat-store'
import { useIsMobile } from '@/hooks'
import { Button } from '@/components/ui'
import { PanelLeft, PanelLeftClose, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppShellProps {
    children: React.ReactNode
    className?: string
}

export function AppShell({ children, className }: AppShellProps) {
    const { isSidebarOpen, toggleSidebar } = useChatStore()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [hasMounted, setHasMounted] = useState(false)
    const isMobile = useIsMobile()

    // Ensure we only render layout-affecting components after hydration
    // to prevent flash of wrong layout on mobile
    useEffect(() => {
        setHasMounted(true)
    }, [])

    // Only render sidebar after mount to prevent hydration mismatch
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
                <div className="relative">
                    {isMobile ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(true)}
                            className="fixed top-3 left-3 h-9 w-9 bg-card/90 backdrop-blur text-foreground hover:bg-card z-30 shadow-sm border border-border/50"
                        >
                            <Menu size={18} />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="absolute top-4 left-6 h-6 w-6 bg-card text-muted-foreground hover:text-foreground z-10"
                        >
                            {isSidebarOpen ? (
                                <PanelLeftClose size={16} />
                            ) : (
                                <PanelLeft size={16} />
                            )}
                        </Button>
                    )}
                </div>
            )}

            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
