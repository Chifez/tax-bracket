import { memo } from 'react'
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
                const button = (
                    <button
                        onClick={() => onChatSelect(chat.id)}
                        className={cn(
                            'flex items-center gap-3 w-full rounded-lg transition-colors text-xs',
                            isCollapsed ? 'justify-center p-2' : 'px-3 py-2',
                            activeChat === chat.id
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                    >
                        <MessageSquare size={16} strokeWidth={1.5} className="shrink-0" />
                        {!isCollapsed && (
                            <span className="truncate text-left flex-1">{chat.title}</span>
                        )}
                    </button>
                )

                return isCollapsed ? (
                    <Tooltip key={chat.id} content={chat.title} side="right">
                        {button}
                    </Tooltip>
                ) : (
                    <div key={chat.id}>{button}</div>
                )
            })}
        </div>
    )
})
