import { Home, Plus, Upload, BarChart3 } from 'lucide-react'

/**
 * Shared navigation items configuration for sidebars
 */
export const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Plus, label: 'New Chat', action: 'newChat' },
    { icon: Upload, label: 'Upload', href: '/upload' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
] as const

export type NavItem = typeof navItems[number]
