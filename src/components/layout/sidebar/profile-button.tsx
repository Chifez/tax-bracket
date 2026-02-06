import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'
import { Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { User } from '@/db/schema'

interface ProfileButtonProps {
    isCollapsed: boolean
    user?: User | null
}

export function ProfileButton({ isCollapsed, user }: ProfileButtonProps) {
    const button = (
        <button
            className={cn(
                'flex items-center gap-3 w-full rounded-lg hover:bg-muted transition-colors',
                isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
            )}
        >
            <Avatar className="h-7 w-7 ring-2 ring-primary/20 shrink-0">
                {user?.image && <AvatarImage src={user.image} key={user.image} />}
                {/* <AvatarImage src={user?.image ?? undefined} /> */}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
                <div className="flex-1 text-left overflow-hidden">
                    <p className="text-[10px] font-medium truncate">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
            )}
        </button>
    )

    return isCollapsed ? (
        <Tooltip content="Profile" side="right">
            {button}
        </Tooltip>
    ) : button
}
