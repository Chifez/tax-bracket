import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui'
import { MessageSquare } from 'lucide-react'
import type { Chat } from '@/types'

interface SidebarChatListProps {
    chats: Chat[]
    activeChat: string | null
    onChatSelect: (chatId: string) => void
    isCollapsed?: boolean
    maxItems?: number
}

/**
 * Shared chat list component for sidebars
 */
export const SidebarChatList = memo(function SidebarChatList({
    chats,
    activeChat,
    onChatSelect,
    isCollapsed = false,
    maxItems = 10
}: SidebarChatListProps) {
    const displayChats = chats.slice(0, maxItems)

    return (
        <div className="flex flex-col gap-1 pb-2">
            {displayChats.map((chat) => {
                const isActive = activeChat === chat.id

                const content = (
                    <>
                        <MessageSquare size={16} strokeWidth={1.5} className="shrink-0" />
                        {!isCollapsed && (
                            <span className="truncate text-left flex-1">{chat.title}</span>
                        )}
                    </>
                )

                const className = cn(
                    'flex items-center gap-3 w-full rounded-lg transition-colors text-xs',
                    isCollapsed ? 'justify-center p-2' : 'px-3 py-2',
                    isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )

                let element: React.ReactNode

                // Use Link for navigation
                element = (
                    <Link
                        to="/chats/$chatId"
                        params={{ chatId: chat.id }}
                        className={className}
                        onClick={() => onChatSelect(chat.id)}
                    >
                        {content}
                    </Link>
                )

                return isCollapsed ? (
                    <Tooltip key={chat.id} content={chat.title} side="right">
                        {element}
                    </Tooltip>
                ) : (
                    <div key={chat.id}>{element}</div>
                )
            })}
        </div>
    )
})
