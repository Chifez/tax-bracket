import { memo } from 'react'
import { FileText, Image as ImageIcon, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/format'

export interface FileAttachmentProps {
    name: string
    type: string
    size?: number
}

/**
 * Displays a file attachment chip with icon, name, and size
 */
export const FileAttachment = memo(function FileAttachment({ name, type, size }: FileAttachmentProps) {
    const isImage = type.startsWith('image/')
    const isPDF = type.includes('pdf')
    const isCSV = type.includes('csv') || name.endsWith('.csv')

    const Icon = isImage ? ImageIcon : (isPDF || isCSV) ? FileText : File
    const bgColor = isPDF ? 'bg-red-500/10' : isCSV ? 'bg-green-500/10' : isImage ? 'bg-blue-500/10' : 'bg-muted'
    const iconColor = isPDF ? 'text-red-500' : isCSV ? 'text-green-500' : isImage ? 'text-blue-500' : 'text-muted-foreground'

    return (
        <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            bgColor
        )}>
            <Icon size={16} className={iconColor} />
            <div className="text-left">
                <p className="text-xs font-medium truncate max-w-[150px]">{name}</p>
                {size && (
                    <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(size)}
                    </p>
                )}
            </div>
        </div>
    )
})
