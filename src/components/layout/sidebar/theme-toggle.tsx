import { memo, useCallback } from 'react'
import { useThemeStore } from '@/stores/theme-store'
import { Button } from '@/components/ui'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
    showLabel?: boolean
    className?: string
}

/**
 * Theme toggle button that cycles between light, dark, and system themes
 */
export const ThemeToggle = memo(function ThemeToggle({ showLabel = false, className }: ThemeToggleProps) {
    const { theme, setTheme } = useThemeStore()

    const cycleTheme = useCallback(() => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
    }, [theme, setTheme])

    const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
    const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

    return (
        <Button
            variant="ghost"
            size={showLabel ? 'sm' : 'icon'}
            onClick={cycleTheme}
            className={cn(
                showLabel ? 'w-full justify-start gap-3 px-3 py-2' : 'h-9 w-9',
                'text-muted-foreground hover:text-foreground',
                className
            )}
        >
            <ThemeIcon size={16} className="shrink-0" />
            {showLabel && <span className="text-sm">{themeLabel}</span>}
        </Button>
    )
})
