import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'
import { useChatStore } from '@/stores/chat-store'
import { Button } from '@/components/ui'
import { PanelLeft, PanelLeftClose, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppShellProps {
    children: React.ReactNode
    className?: string
}

// Hook to detect mobile screen
function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint)
        }

        // Check on mount
        checkMobile()

        // Listen for resize
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [breakpoint])

    return isMobile
}

export function AppShell({ children, className }: AppShellProps) {
    const { isSidebarOpen, toggleSidebar } = useChatStore()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const isMobile = useIsMobile()

    return (
        <div className={cn('flex h-screen overflow-hidden', className)}>
            {/* Desktop Sidebar */}
            {!isMobile && <Sidebar />}

            {/* Mobile Sidebar (Drawer) */}
            {isMobile && (
                <MobileSidebar
                    isOpen={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Toggle Button */}
            <div className="relative">
                {isMobile ? (
                    // Mobile: Hamburger menu button
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(true)}
                        className="fixed top-3 left-3 h-9 w-9 bg-card/90 backdrop-blur text-foreground hover:bg-card z-30 shadow-sm border border-border/50"
                    >
                        <Menu size={18} />
                    </Button>
                ) : (
                    // Desktop: Panel toggle button
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

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
