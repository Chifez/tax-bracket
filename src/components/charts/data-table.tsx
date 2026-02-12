import { memo } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'



export interface DataTableProps {
    title: string
    description?: string
    columns: string[]
    rows: (string | number)[][]
    fixedColumn?: boolean   // default true — pin first column
    className?: string
}



function formatCellValue(value: string | number): string {
    if (typeof value === 'number') {
        // Nigerian currency-style formatting for large numbers
        if (Math.abs(value) >= 1000) {
            return value.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        }
        return String(value)
    }
    return value
}



export const DataTable = memo(function DataTable({
    title,
    description,
    columns,
    rows,
    fixedColumn = true,
    className,
}: DataTableProps) {
    const colCount = columns.length
    const rowCount = rows.length

    return (
        <Card className={cn('overflow-hidden mx-2 max-w-[calc(100vw-2rem)]', className)}>
            {/* Header — matches chart header */}
            <div className="p-4 pb-3 border-b bg-muted/30">
                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-semibold text-sm">{title}</h4>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold tracking-wide">
                        TAXBRACKET
                    </div>
                </div>

                <div className="flex gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                        {colCount} Columns
                    </span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded">
                        {rowCount} Rows
                    </span>
                </div>
            </div>

            {/* Table container — scrollable both axes */}
            <div
                className={cn(
                    'overflow-auto relative',
                    // Desktop: same height as chart (h-56 = 14rem)
                    'h-56',
                    // Mobile: taller for more data visibility
                    'max-sm:h-72',
                )}
            >
                <table className="w-full text-xs border-collapse min-w-max">
                    {/* Sticky header */}
                    <thead className="sticky top-0 z-30">
                        <tr>
                            {columns.map((col, i) => (
                                <th
                                    key={i}
                                    className={cn(
                                        'px-3 py-2.5 text-left font-semibold whitespace-nowrap',
                                        'bg-card text-foreground border-b border-border/80',
                                        fixedColumn && i === 0 && 'sticky left-0 z-40 bg-white',
                                    )}

                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className={cn(
                                    'transition-colors group',
                                    'hover:bg-primary/4',
                                    rowIdx % 2 === 1 && 'bg-muted/20',
                                    fixedColumn && 'z-40',
                                )}
                            >
                                {row.map((cell, cellIdx) => {
                                    const isFixed = fixedColumn && cellIdx === 0
                                    const isNumber = typeof cell === 'number'

                                    return (
                                        <td
                                            key={cellIdx}
                                            className={cn(
                                                'px-3 py-2 whitespace-nowrap border-b border-border/30',

                                                isFixed && 'sticky left-0 z-20 font-medium',
                                                isFixed && rowIdx % 2 === 0 && 'bg-card',
                                                isFixed && rowIdx % 2 === 1 && 'bg-card',

                                                isFixed && 'after:absolute after:inset-0 after:bg-primary/4 after:opacity-0 group-hover:after:opacity-100 after:pointer-events-none after:transition-opacity',
                                                isNumber && 'text-right tabular-nums',
                                            )}
                                            style={isFixed
                                                ? { boxShadow: '2px 0 4px -1px rgba(0,0,0,0.1)' }
                                                : undefined
                                            }
                                        >
                                            {formatCellValue(cell)}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
})
