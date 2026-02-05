import { useState, memo } from 'react'
import type { ResponseSection, Source } from '@/types'
import { cn } from '@/lib/utils'
import { ChevronRight, FileText } from 'lucide-react'
import { iconMap } from './icon-map'
import { ContentBlock } from './content-block'
import { SourceBadge } from './source-badge'

interface StepSectionProps {
    section: ResponseSection
    stepNumber: number
    sources?: Source[]
}

/**
 * Collapsible step section within document response
 */
export const StepSection = memo(function StepSection({ section, stepNumber, sources }: StepSectionProps) {
    const [isOpen, setIsOpen] = useState(true)
    const Icon = section.icon ? iconMap[section.icon] || FileText : FileText

    return (
        <div className="border-l-2 border-border pl-4 ml-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 py-2 w-full text-left group"
            >
                <ChevronRight
                    size={14}
                    className={cn(
                        'text-muted-foreground transition-transform shrink-0',
                        isOpen && 'rotate-90'
                    )}
                />
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                    {stepNumber}
                </div>
                <Icon size={14} className="text-primary shrink-0" />
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                    {section.title}
                </span>
            </button>

            {isOpen && (
                <div className="pl-9 pb-3 space-y-2">
                    {section.contents.map((content, idx) => (
                        <ContentBlock key={idx} content={content} />
                    ))}

                    {sources && sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {sources.slice(0, 2).map((source) => (
                                <SourceBadge key={source.id} source={source} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})
