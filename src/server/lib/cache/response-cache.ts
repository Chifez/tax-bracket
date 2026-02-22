import { createHash } from 'crypto'

interface CacheEntry {
    value: any
    expiresAt: number
}

const MAX_CACHE_SIZE = 1000
const DEFAULT_TTL = 1000 * 60 * 60 * 24

class ResponseCache {
    private cache: Map<string, CacheEntry> = new Map()

    constructor() {
        setInterval(() => this.cleanup(), 1000 * 60 * 60)
    }

    get(key: string): any | null {
        const entry = this.cache.get(key)
        if (!entry) return null

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }

        return entry.value
    }

    set(key: string, value: any, ttl: number = DEFAULT_TTL) {
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value
            if (firstKey) this.cache.delete(firstKey)
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        })
    }

    generateKey(userId: string, lastMessage: string, contextId: string | null): string {
        const data = `${userId}:${lastMessage.trim().toLowerCase()}:${contextId || 'no-context'}`
        return createHash('md5').update(data).digest('hex')
    }

    private cleanup() {
        const now = Date.now()
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
            }
        }
    }
}

export const responseCache = new ResponseCache()
