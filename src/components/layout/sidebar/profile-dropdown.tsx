import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { User, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileDropdownProps {
    user: any
    isCollapsed?: boolean
    side?: 'right' | 'top' | 'bottom' | 'left'
    onSettingsClick?: () => void
}

export function ProfileDropdown({ user, isCollapsed, side = 'right' }: ProfileDropdownProps) {

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full h-auto p-2 gap-2 hover:bg-muted justify-start",
                        isCollapsed && "justify-center px-2"
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
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" side={side} align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        <User size={16} strokeWidth={1.75} className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem >
                        <HelpCircle size={16} strokeWidth={1.75} className="mr-2 h-4 w-4" />
                        <span>Help & Support</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
