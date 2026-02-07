import { Home, Plus, Upload, Search } from 'lucide-react'

/**
 * Shared navigation items configuration for sidebars
 */
export const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Plus, label: 'New Chat', action: 'newChat' },
    { icon: Search, label: 'Search', action: 'search' },
    { icon: Upload, label: 'Uploads', href: '/uploads' },
] as const

export type NavItem = typeof navItems[number]
