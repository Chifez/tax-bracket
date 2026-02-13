import { memo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Tooltip, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, Button, Input } from '@/components/ui'
import { MessageSquare, MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { Chat } from '@/types'
import { useDeleteChat, useRenameChat } from '@/hooks/use-chat'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface SidebarChatListProps {
    chats: Chat[]
    activeChat: string | null
    isCollapsed?: boolean
    maxItems?: number
}

/**
 * Shared chat list component for sidebars
 */
export const SidebarChatList = memo(function SidebarChatList({
    chats,
    activeChat,
    isCollapsed = false,
    maxItems = 10
}: SidebarChatListProps) {
    const displayChats = chats.slice(0, maxItems)
    const { mutateAsync: deleteChat, isPending: isDeleting } = useDeleteChat()
    const { mutateAsync: renameChat, isPending: isRenaming } = useRenameChat()

    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
    const [newTitle, setNewTitle] = useState('')

    const handleEditStart = (chat: Chat) => {
        setEditingChatId(chat.id)
        setNewTitle(chat.title)
    }

    const handleRename = async () => {
        if (editingChatId && newTitle.trim()) {
            await renameChat({ chatId: editingChatId, title: newTitle.trim() })
            setEditingChatId(null)
        }
    }

    const handleDelete = async () => {
        if (deletingChatId) {
            await deleteChat(deletingChatId)
            setDeletingChatId(null)
        }
    }

    return (
        <>
            <div className="flex flex-col gap-1 pb-2">
                {displayChats.map((chat) => {
                    const isActive = activeChat === chat.id

                    const linkContent = (
                        <>
                            <MessageSquare size={16} strokeWidth={1.5} className="shrink-0" />
                            {!isCollapsed && (
                                <span className="truncate text-left flex-1">{chat.title}</span>
                            )}
                        </>
                    )

                    const baseClassName = cn(
                        'flex items-center gap-3 rounded-lg transition-colors text-xs relative group/item',
                        isCollapsed ? 'justify-center p-2 w-full' : 'px-3 py-2 w-full',
                        isActive
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )

                    let element: React.ReactNode

                    if (isCollapsed) {
                        element = (
                            <Link
                                to="/chats/$chatId"
                                params={{ chatId: chat.id }}
                                className={baseClassName}
                            >
                                {linkContent}
                            </Link>
                        )
                    } else {
                        element = (
                            <div className={baseClassName}>
                                <Link
                                    to="/chats/$chatId"
                                    params={{ chatId: chat.id }}
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                    {linkContent}
                                </Link>

                                {!isCollapsed && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity p-1 hover:bg-background/80 rounded" onClick={(e) => e.stopPropagation()}>
                                                <MoreVertical size={16} strokeWidth={1.5} className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditStart(chat)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingChatId(chat.id)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )
                    }

                    return isCollapsed ? (
                        <Tooltip key={chat.id} content={chat.title} side="right">
                            {element}
                        </Tooltip>
                    ) : (
                        <div key={chat.id}>{element}</div>
                    )
                })}
            </div>

            {/* Rename Dialog */}
            <Dialog open={!!editingChatId} onOpenChange={(open) => !open && setEditingChatId(null)} >
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Chat title"
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            disabled={isRenaming}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingChatId(null)} disabled={isRenaming}>Cancel</Button>
                        <Button onClick={handleRename} disabled={isRenaming}>
                            {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isRenaming ? 'Saving' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingChatId} onOpenChange={(open) => !open && setDeletingChatId(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Delete Chat?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the chat and all associated messages and files.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingChatId(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isDeleting ? 'Deleting' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
})
