# Caching Strategy Plan for TaxBracket

## Executive Summary

This document outlines a comprehensive caching strategy to improve performance, reduce API costs, and enhance user experience across the TaxBracket application.

---

## Current State Analysis

### Existing Caching Mechanisms

1. **TanStack Query (React Query)**
   - Client-side caching for API responses
   - Used for: chats, messages, user data, uploads
   - Current `staleTime`: 5 minutes for user data, default for others
   - No server-side caching layer

2. **Database**
   - PostgreSQL as primary data store
   - No query result caching
   - No connection pooling optimization mentioned

3. **File Storage**
   - AWS S3 for file storage
   - No CDN or edge caching

4. **AI/LLM Calls**
   - Direct OpenAI API calls
   - No response caching
   - No request deduplication

---

## Caching Strategy Overview

### 1. Client-Side Caching (TanStack Query)

**Current Issues:**
- Inconsistent `staleTime` configuration
- No `cacheTime` optimization
- Missing prefetching strategies
- No optimistic updates for mutations

**Recommendations:**

#### A. Standardize Query Configuration

```typescript
// src/lib/query-config.ts
export const queryConfig = {
  // Chat data - frequently accessed, changes infrequently
  chats: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  },
  
  // Individual chat - accessed often, updates frequently
  chat: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
  },
  
  // User data - changes rarely
  user: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
  },
  
  // Tax context - expensive to compute, changes rarely
  taxContext: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
  },
  
  // Transactions - large datasets, changes frequently
  transactions: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
  },
  
  // File uploads - changes frequently during upload
  uploads: {
    staleTime: 1000 * 30, // 30 seconds
    cacheTime: 1000 * 60 * 5, // 5 minutes
  },
}
```

#### B. Implement Prefetching

```typescript
// Prefetch chat list on sidebar hover
// Prefetch chat data on route navigation
// Prefetch tax context when user opens chat with files
```

#### C. Optimistic Updates

```typescript
// Optimistic updates for:
// - Message sending (already implemented)
// - Chat renaming
// - Message editing
// - Chat deletion
```

---

### 2. Server-Side Caching

#### A. Redis Cache Layer

**Purpose:** Reduce database load, cache expensive computations, enable request deduplication

**Implementation:**

```typescript
// src/server/lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export const cache = {
  // Cache tax context (expensive computation)
  async getTaxContext(userId: string, taxYear: number) {
    const key = `tax_context:${userId}:${taxYear}`
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached)
    return null
  },
  
  async setTaxContext(userId: string, taxYear: number, context: any, ttl = 3600) {
    const key = `tax_context:${userId}:${taxYear}`
    await redis.setex(key, ttl, JSON.stringify(context))
  },
  
  // Cache chat data
  async getChat(chatId: string) {
    const key = `chat:${chatId}`
    return await redis.get(key)
  },
  
  async setChat(chatId: string, data: any, ttl = 300) {
    await redis.setex(`chat:${chatId}`, ttl, JSON.stringify(data))
  },
  
  // Cache aggregated transaction data
  async getAggregates(userId: string, taxYear: number) {
    const key = `aggregates:${userId}:${taxYear}`
    return await redis.get(key)
  },
  
  async setAggregates(userId: string, taxYear: number, data: any, ttl = 600) {
    await redis.setex(key, ttl, JSON.stringify(data))
  },
  
  // Invalidate cache on mutations
  async invalidateChat(chatId: string) {
    await redis.del(`chat:${chatId}`)
    await redis.del(`chats:list:*`) // Invalidate all chat lists
  },
  
  async invalidateTaxContext(userId: string, taxYear: number) {
    await redis.del(`tax_context:${userId}:${taxYear}`)
    await redis.del(`aggregates:${userId}:${taxYear}`)
  },
}
```

**Cache Keys Structure:**
```
tax_context:{userId}:{taxYear}          # TTL: 1 hour
chat:{chatId}                           # TTL: 5 minutes
chats:list:{userId}                     # TTL: 5 minutes
aggregates:{userId}:{taxYear}           # TTL: 10 minutes
file:{fileId}                           # TTL: 1 hour
transaction:{transactionId}             # TTL: 15 minutes
```

**Cache Invalidation Strategy:**
- **Write-through:** Update cache immediately on writes
- **Write-behind:** Update cache asynchronously for non-critical data
- **TTL-based:** Automatic expiration for time-sensitive data
- **Event-based:** Invalidate on mutations (chat created, message sent, file uploaded)

#### B. Database Query Caching

**PostgreSQL Query Cache:**
- Use `pg_stat_statements` to identify slow queries
- Add indexes for frequently queried columns
- Consider materialized views for complex aggregations

**Connection Pooling:**
- Use `pgBouncer` or `pg-pool` for connection pooling
- Configure pool size based on load

---

### 3. AI/LLM Response Caching

**Problem:** Expensive API calls, repeated similar queries

**Solution:** Cache AI responses based on:
- User message content (hash)
- File context (file IDs hash)
- Tax year
- System prompt version

**Implementation:**

```typescript
// src/server/lib/ai-cache.ts
import crypto from 'crypto'

function hashRequest(messages: UIMessage[], fileIds: string[], taxYear: number): string {
  const content = JSON.stringify({ messages, fileIds, taxYear })
  return crypto.createHash('sha256').update(content).digest('hex')
}

export async function getCachedAIResponse(
  messages: UIMessage[],
  fileIds: string[],
  taxYear: number
): Promise<string | null> {
  const key = `ai_response:${hashRequest(messages, fileIds, taxYear)}`
  return await redis.get(key)
}

export async function cacheAIResponse(
  messages: UIMessage[],
  fileIds: string[],
  taxYear: number,
  response: string,
  ttl = 3600 * 24 // 24 hours
) {
  const key = `ai_response:${hashRequest(messages, fileIds, taxYear)}`
  await redis.setex(key, ttl, response)
}

// Invalidate when:
// - New file uploaded
// - Tax context regenerated
// - System prompt updated
```

**Cache Strategy:**
- **Exact match:** Same messages + same files = cached response
- **Partial match:** Similar queries could use semantic similarity (future enhancement)
- **TTL:** 24 hours for AI responses (longer than chat data)

---

### 4. File/Asset Caching

#### A. S3 CloudFront CDN

**Current:** Direct S3 access
**Proposed:** CloudFront CDN in front of S3

**Benefits:**
- Reduced latency (edge caching)
- Lower S3 costs
- Better global performance

**Implementation:**
1. Create CloudFront distribution
2. Point to S3 bucket
3. Configure cache behaviors:
   - PDF/CSV files: 1 hour cache
   - Images: 1 day cache
   - Private files: Signed URLs with short TTL

#### B. Client-Side File Caching

```typescript
// Cache parsed file data in IndexedDB
// Cache file metadata in React Query
// Prefetch files when chat loads
```

---

### 5. Request Deduplication

**Problem:** Multiple components requesting same data simultaneously

**Solution:** TanStack Query already handles this, but we can optimize:

```typescript
// Ensure queries share same queryKey
// Use queryClient.prefetchQuery for anticipated requests
// Implement request batching for multiple chat loads
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. ✅ Standardize TanStack Query configuration
2. ✅ Add Redis infrastructure
3. ✅ Implement basic cache utilities
4. ✅ Add cache invalidation hooks

### Phase 2: Core Caching (Week 3-4)
1. ✅ Cache tax context computation
2. ✅ Cache chat data
3. ✅ Cache aggregated transaction data
4. ✅ Implement cache warming strategies

### Phase 3: AI Optimization (Week 5-6)
1. ✅ Implement AI response caching
2. ✅ Add request deduplication
3. ✅ Cache system prompt variations
4. ✅ Monitor cache hit rates

### Phase 4: Asset Optimization (Week 7-8)
1. ✅ Set up CloudFront CDN
2. ✅ Implement client-side file caching
3. ✅ Optimize image loading
4. ✅ Add prefetching for anticipated files

### Phase 5: Monitoring & Optimization (Ongoing)
1. ✅ Add cache metrics (hit rate, miss rate, latency)
2. ✅ Monitor Redis memory usage
3. ✅ Optimize TTLs based on usage patterns
4. ✅ A/B test cache strategies

---

## What to Cache

### High Priority (Immediate Impact)

1. **Tax Context** ⭐⭐⭐
   - Expensive computation (aggregates + context building)
   - Changes infrequently
   - Used in every AI chat request
   - **Cache TTL:** 1 hour
   - **Invalidate on:** File upload, transaction import, manual regeneration

2. **Chat Data** ⭐⭐⭐
   - Frequently accessed
   - Changes moderately
   - **Cache TTL:** 5 minutes
   - **Invalidate on:** Message sent, chat renamed, message edited

3. **Transaction Aggregates** ⭐⭐
   - Expensive computation
   - Used for tax calculations
   - **Cache TTL:** 10 minutes
   - **Invalidate on:** Transaction import, file upload

4. **AI Responses** ⭐⭐
   - Very expensive (API costs)
   - Users may ask similar questions
   - **Cache TTL:** 24 hours
   - **Invalidate on:** File upload, tax context regeneration

### Medium Priority

5. **Chat List** ⭐
   - Frequently accessed
   - Changes moderately
   - **Cache TTL:** 5 minutes

6. **File Metadata** ⭐
   - Accessed when loading chats
   - Changes infrequently
   - **Cache TTL:** 1 hour

7. **User Data** ⭐
   - Changes rarely
   - **Cache TTL:** 10 minutes

### Low Priority (Future)

8. **Parsed File Data**
   - Large datasets
   - Consider IndexedDB for client-side

9. **System Prompt Variations**
   - If we support multiple prompt versions

---

## Cache Invalidation Strategy

### Event-Based Invalidation

```typescript
// src/server/lib/cache-invalidation.ts

export const cacheInvalidation = {
  onChatCreated: (chatId: string, userId: string) => {
    redis.del(`chats:list:${userId}`)
  },
  
  onMessageSent: (chatId: string) => {
    redis.del(`chat:${chatId}`)
    redis.del(`chats:list:*`) // Invalidate all lists
  },
  
  onFileUploaded: (userId: string, taxYear: number) => {
    redis.del(`tax_context:${userId}:${taxYear}`)
    redis.del(`aggregates:${userId}:${taxYear}`)
    redis.del(`ai_response:*`) // Invalidate all AI responses for this user/year
  },
  
  onTaxContextRegenerated: (userId: string, taxYear: number) => {
    redis.del(`tax_context:${userId}:${taxYear}`)
    redis.del(`aggregates:${userId}:${taxYear}`)
    redis.del(`ai_response:*`)
  },
}
```

### TTL-Based Expiration

- Automatic expiration based on TTL
- Redis handles this automatically
- Monitor and adjust TTLs based on usage patterns

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Cache Hit Rate**
   - Target: >70% for tax context, >50% for chats
   - Monitor per cache key pattern

2. **Cache Miss Latency**
   - Time to compute on cache miss
   - Compare with cache hit latency

3. **Redis Memory Usage**
   - Monitor memory consumption
   - Set up alerts for high usage

4. **API Cost Reduction**
   - Track AI API calls before/after caching
   - Calculate cost savings

5. **Database Query Reduction**
   - Track query count reduction
   - Monitor database load

### Tools

- **Redis Insight:** Monitor Redis performance
- **TanStack Query DevTools:** Monitor client-side cache
- **Custom Metrics:** Add Prometheus/Grafana for production

---

## Cost-Benefit Analysis

### Estimated Savings

1. **AI API Costs**
   - Current: ~$0.01-0.05 per request
   - With caching: 30-50% reduction
   - **Monthly savings:** $XXX (depends on usage)

2. **Database Load**
   - Reduced query count: 40-60%
   - Lower database costs
   - Better performance

3. **User Experience**
   - Faster response times: 50-80% improvement
   - Reduced loading states
   - Better perceived performance

### Infrastructure Costs

- **Redis:** ~$10-50/month (depending on size)
- **CloudFront:** ~$5-20/month (depending on traffic)
- **Total:** ~$15-70/month

**ROI:** Positive if >1000 AI requests/month

---

## Risk Mitigation

### Cache Staleness

- **Risk:** Users see outdated data
- **Mitigation:** 
  - Conservative TTLs
  - Event-based invalidation
  - Manual refresh options

### Cache Failures

- **Risk:** Redis downtime
- **Mitigation:**
  - Fallback to database
  - Redis replication
  - Health checks and alerts

### Memory Issues

- **Risk:** Redis memory exhaustion
- **Mitigation:**
  - Set memory limits
  - Use LRU eviction policy
  - Monitor memory usage

---

## Next Steps

1. **Review & Approve Plan**
   - Review with team
   - Prioritize phases
   - Allocate resources

2. **Set Up Infrastructure**
   - Provision Redis instance
   - Set up CloudFront (if approved)
   - Configure monitoring

3. **Implement Phase 1**
   - Standardize query config
   - Add cache utilities
   - Test with one feature (tax context)

4. **Iterate & Optimize**
   - Monitor metrics
   - Adjust TTLs
   - Expand caching to more features

---

## Appendix: Code Examples

### Example: Cached Tax Context

```typescript
// src/server/functions/context.ts
export const getTaxContext = createServerFn()
  .inputValidator((data: unknown) => getTaxContextSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser()
    if (!user) throw unauthorized()

    // Check cache first
    const cached = await cache.getTaxContext(user.id, data.taxYear)
    if (cached) {
      return cached
    }

    // Compute if not cached
    const row = await db.select()
      .from(taxContext)
      .where(and(
        eq(taxContext.userId, user.id),
        eq(taxContext.taxYear, data.taxYear),
      ))
      .limit(1)

    if (row.length === 0) {
      return { context: null, tokenEstimate: 0 }
    }

    const result = {
      context: row[0].contextJson as CompactTaxContext,
      tokenEstimate: row[0].tokenEstimate,
      version: row[0].version,
    }

    // Cache the result
    await cache.setTaxContext(user.id, data.taxYear, result)

    return result
  })
```

### Example: Cached Chat Data

```typescript
// src/server/functions/chat.ts
export const getChat = createServerFn()
  .inputValidator((data: unknown) => getChatSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser()
    if (!user) throw unauthorized()

    // Check cache
    const cached = await cache.getChat(data.chatId)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Verify user ownership
      if (parsed.userId === user.id) {
        return parsed
      }
    }

    // Fetch from database
    const chat = await db.query.chats.findFirst({
      where: and(
        eq(chats.id, data.chatId),
        eq(chats.userId, user.id)
      ),
      with: { messages: true }
    })

    if (!chat) throw notFound()

    // Cache the result
    await cache.setChat(data.chatId, chat)

    return chat
  })
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Author:** AI Assistant  
**Status:** Draft - Pending Review
