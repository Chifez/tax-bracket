import { memo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ChartData } from '@/types'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatValue, formatSeriesName } from '@/lib/format'

interface FinancialChartProps {
    chart: ChartData
    className?: string
}

const CHART_COLORS = [
    'var(--primary)',
    '#f59e0b',
    '#3b82f6',
    '#ef4444',
    '#8b5cf6',
]

export const FinancialChart = memo(function FinancialChart({ chart, className }: FinancialChartProps) {
    const chartType = chart.type || 'line'
    const isMultiLine = chartType === 'multi-line'
    const seriesKeys = chart.yKeys || ['value']
    const seriesCount = isMultiLine ? seriesKeys.length : 1

    return (
        <Card className={cn('overflow-hidden mx-2 py-2', className)}>
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

                <div className="flex gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                        {seriesCount} Series
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

            <div className="h-56 p-4">
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
                                formatter={(value) => [formatValue(value as number), 'Value']}
                            />
                            <Bar
                                dataKey="value"
                                fill="var(--primary)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    ) : isMultiLine ? (
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
                                formatter={(value, name) => [formatValue((value as number) ?? 0), formatSeriesName(name as string)]}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '11px' }}
                                formatter={(value) => formatSeriesName(value)}
                            />
                            {seriesKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key}
                                    stroke={chart.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ fill: chart.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 0, r: 3 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            ))}
                        </LineChart>
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
                                formatter={(value) => [formatValue(value as number), 'Value']}
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
})
