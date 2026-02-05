import { useState, useEffect, useSyncExternalStore } from 'react'

/**
 * Hook to detect if the current screen is mobile-sized
 * Uses resize listener for reactive updates
 */
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false
        return window.innerWidth < breakpoint
    })

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [breakpoint])

    return isMobile
}

/**
 * Hook to detect user's preferred color scheme
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = (callback: () => void) => {
        const mediaQuery = window.matchMedia(query)
        mediaQuery.addEventListener('change', callback)
        return () => mediaQuery.removeEventListener('change', callback)
    }

    const getSnapshot = () => {
        return window.matchMedia(query).matches
    }

    const getServerSnapshot = () => false

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}
