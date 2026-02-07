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
import { useLogout } from '@/hooks/use-auth'
import { User, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileDropdownProps {
    user: any
    isCollapsed?: boolean
    side?: 'right' | 'top' | 'bottom' | 'left'
    onSettingsClick?: () => void
}

export function ProfileDropdown({ user, isCollapsed, side = 'right', onSettingsClick }: ProfileDropdownProps) {
    const { mutate: logout } = useLogout()

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
                    <Avatar className="h-6 w-6 shrink-0">
                        {user?.image && <AvatarImage src={user.image} />}
                        <AvatarFallback className="text-[10px]">
                            {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>

                    {!isCollapsed && (
                        <div className="flex flex-col items-start min-w-0">
                            <span className="text-sm font-medium truncate w-full text-left">
                                {user?.name || 'User'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate w-full text-left">
                                {user?.email}
                            </span>
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
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSettingsClick}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
