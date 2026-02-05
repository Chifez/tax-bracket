import type React from 'react'
import { TrendingUp, DollarSign, PieChart, AlertCircle, FileText, Check, Target, Calculator, Wallet, Receipt, Lightbulb } from 'lucide-react'

/**
 * Map of icon names to Lucide React components
 */
export const iconMap: Record<string, React.ElementType> = {
    'trending-up': TrendingUp,
    'dollar-sign': DollarSign,
    'pie-chart': PieChart,
    'alert-circle': AlertCircle,
    'file-text': FileText,
    'check': Check,
    'target': Target,
    'calculator': Calculator,
    'wallet': Wallet,
    'receipt': Receipt,
    'lightbulb': Lightbulb,
}
