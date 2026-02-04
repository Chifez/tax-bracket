import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ChartData } from '@/types'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'

interface FinancialChartProps {
    chart: ChartData
    className?: string
}

/**
 * Financial chart component using Recharts
 * Supports line and bar charts with proper theming
 */
export function FinancialChart({ chart, className }: FinancialChartProps) {
    const chartType = chart.type || 'line'

    return (
        <Card className={cn('overflow-hidden', className)}>
            {/* Header */}
            <div className="p-4 pb-3 border-b bg-muted/30">
                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-semibold text-sm">{chart.title}</h4>
                        {chart.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {chart.description}
                            </p>
                        )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold tracking-wide">
                        TAXBRACKET
                    </div>
                </div>

                {/* Chart metadata pills */}
                <div className="flex gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                        1 Series
                    </span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded">
                        {chart.data?.length || 0} Points
                    </span>
                    {chart.dateRange && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded">
                            {chart.dateRange}
                        </span>
                    )}
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-52 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                        <BarChart data={chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                axisLine={{ stroke: 'var(--border)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => formatValue(value)}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                                formatter={(value: number) => [formatValue(value), 'Value']}
                            />
                            <Bar
                                dataKey="value"
                                fill="var(--primary)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    ) : (
                        <LineChart data={chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                axisLine={{ stroke: 'var(--border)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => formatValue(value)}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                                formatter={(value: number) => [formatValue(value), 'Value']}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--primary)', strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </Card>
    )
}

function formatValue(value: number): string {
    if (value >= 1000000) {
        return `₦${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
        return `₦${(value / 1000).toFixed(0)}K`
    }
    return `₦${value.toLocaleString()}`
}
