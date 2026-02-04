import { Sidebar } from './sidebar'
import { useChatStore } from '@/stores/chat-store'
import { Button } from '@/components/ui'
import { PanelLeft, PanelLeftClose } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppShellProps {
    children: React.ReactNode
    className?: string
}

export function AppShell({ children, className }: AppShellProps) {
    const { isSidebarOpen, toggleSidebar } = useChatStore()

    return (
        <div className={cn('flex h-screen overflow-hidden', className)}>
            <Sidebar />

            {/* Toggle Button - Outside Sidebar */}
            <div className="relative">

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

            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
