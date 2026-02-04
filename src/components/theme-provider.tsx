import { useEffect } from 'react'
import { useThemeStore, getResolvedTheme } from '@/stores/theme-store'

interface ThemeProviderProps {
    children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const { theme } = useThemeStore()

    useEffect(() => {
        const root = document.documentElement
        const resolvedTheme = getResolvedTheme(theme)

        // Remove existing theme class
        root.classList.remove('light', 'dark')
        // Add new theme class
        root.classList.add(resolvedTheme)

        // Listen for system preference changes
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = (e: MediaQueryListEvent) => {
                root.classList.remove('light', 'dark')
                root.classList.add(e.matches ? 'dark' : 'light')
            }

            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        }
    }, [theme])

    return <>{children}</>
}
