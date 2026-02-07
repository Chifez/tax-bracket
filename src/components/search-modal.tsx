import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, FileText, MessageSquare, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useNavigate } from '@tanstack/react-router'

interface SearchModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

import { useChats } from '@/hooks/use-chat'

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const { uploadedFiles } = useChatStore()
    const { data: chatsData } = useChats()
    const chats = chatsData?.chats ?? []
    const navigate = useNavigate()

    // Reset query when closed
    useEffect(() => {
        if (!open) setQuery('')
    }, [open])

    const filteredChats = chats.filter(c =>
        c.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)

    const filteredFiles = uploadedFiles.filter(f =>
        f.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)

    const hasResults = filteredChats.length > 0 || filteredFiles.length > 0

    const handleSelect = (path: string) => {
        navigate({ to: path })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-[550px]">
                <DialogTitle className="sr-only">Search</DialogTitle>
                <div className="flex items-center px-4 py-3 border-b">
                    <Search className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                    <input
                        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-base"
                        placeholder="Search chats and files..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="bg-muted/30">
                    {!query && (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Try searching for "Tax Return" or "Analysis"
                        </div>
                    )}

                    {query && !hasResults && (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No results found.
                        </div>
                    )}

                    {query && hasResults && (
                        <ScrollArea className="max-h-[300px]">
                            <div className="p-2 space-y-4">
                                {filteredChats.length > 0 && (
                                    <div className="space-y-1">
                                        <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Chats
                                        </h4>
                                        {filteredChats.map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => handleSelect(`/chats/${chat.id}`)}
                                                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm text-left group"
                                            >
                                                <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                                    <MessageSquare size={14} />
                                                </div>
                                                <span className="flex-1 truncate">{chat.title}</span>
                                                <ArrowRight size={14} className="opacity-0 group-hover:opacity-50 text-muted-foreground" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredFiles.length > 0 && (
                                    <div className="space-y-1">
                                        <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Files
                                        </h4>
                                        {filteredFiles.map(file => (
                                            <button
                                                key={file.id}
                                                // TODO: Navigate to file preview or generic uploads for now
                                                onClick={() => handleSelect('/uploads')}
                                                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm text-left group"
                                            >
                                                <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-500">
                                                    <FileText size={14} />
                                                </div>
                                                <span className="flex-1 truncate">{file.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-[10px] text-muted-foreground">
                    <span>Press <kbd className="px-1 py-0.5 rounded bg-background border ml-1">Esc</kbd> to close</span>
                </div>
            </DialogContent>
        </Dialog>
    )
}
