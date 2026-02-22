type MetricType = 'ttft' | 'latency' | 'token_usage'

interface MetricEvent {
    type: MetricType
    value: number
    tags?: Record<string, string>
    timestamp: number
}

class PerformanceTracker {
    private metrics: MetricEvent[] = []

    track(type: MetricType, value: number, tags?: Record<string, string>) {
        this.metrics.push({
            type,
            value,
            tags,
            timestamp: Date.now()
        })

        if (process.env.NODE_ENV === 'development') {
            const tagStr = tags ? ` [${JSON.stringify(tags)}]` : ''
            console.log(`[Metrics] ${type}: ${value}ms${tagStr}`)
        }
    }

    getStats() {
        return {
            count: this.metrics.length,
            lastEvent: this.metrics[this.metrics.length - 1]
        }
    }
}

export const performanceTracker = new PerformanceTracker()
