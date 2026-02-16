/**
 * RAG Retrieval System
 * 
 * Retrieves relevant knowledge chunks based on query similarity
 */

import { generateEmbedding, searchSimilarChunks } from './embeddings'
import { getCoreChunks } from './knowledge-chunks'

export interface RetrievalResult {
    chunks: RetrievedChunk[]
    totalTokens: number
    queryTime: number
}

export interface RetrievedChunk {
    id: string
    title: string
    content: string
    category: string
    similarity: number
}

/**
 * Retrieve relevant knowledge chunks for a query
 */
export async function retrieveRelevantChunks(
    query: string,
    options: {
        limit?: number
        minSimilarity?: number
        includeCore?: boolean
        maxTokens?: number
    } = {}
): Promise<RetrievalResult> {
    const {
        limit = 5,
        minSimilarity = 0.5,
        includeCore = true,
        maxTokens = 2000,
    } = options

    const startTime = Date.now()

    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query)

        // Search for similar chunks
        const similarChunks = await searchSimilarChunks(
            queryEmbedding,
            limit,
            minSimilarity
        )

        // Convert to RetrievedChunk format
        let chunks: RetrievedChunk[] = similarChunks.map(chunk => ({
            id: chunk.chunkId,
            title: chunk.title,
            content: chunk.content,
            category: chunk.category,
            similarity: chunk.similarity,
        }))

        // Add core chunks if requested
        if (includeCore) {
            const coreChunks = getCoreChunks()
            const coreIds = new Set(chunks.map(c => c.id))
            
            for (const core of coreChunks) {
                if (!coreIds.has(core.id)) {
                    chunks.unshift({
                        id: core.id,
                        title: core.title,
                        content: core.content,
                        category: core.category,
                        similarity: 1.0, // Core chunks always have max similarity
                    })
                }
            }
        }

        // Trim to max tokens
        let totalTokens = 0
        const trimmedChunks: RetrievedChunk[] = []

        for (const chunk of chunks) {
            const chunkTokens = estimateTokens(chunk.content)
            if (totalTokens + chunkTokens <= maxTokens) {
                trimmedChunks.push(chunk)
                totalTokens += chunkTokens
            }
        }

        return {
            chunks: trimmedChunks,
            totalTokens,
            queryTime: Date.now() - startTime,
        }
    } catch (error) {
        console.error('RAG retrieval failed:', error)

        // Fallback to core chunks only
        const coreChunks = getCoreChunks()
        let totalTokens = 0
        const fallbackChunks: RetrievedChunk[] = []

        for (const chunk of coreChunks) {
            const chunkTokens = estimateTokens(chunk.content)
            fallbackChunks.push({
                id: chunk.id,
                title: chunk.title,
                content: chunk.content,
                category: chunk.category,
                similarity: 1.0,
            })
            totalTokens += chunkTokens
        }

        return {
            chunks: fallbackChunks,
            totalTokens,
            queryTime: Date.now() - startTime,
        }
    }
}

/**
 * Estimate token count for text
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
}

/**
 * Build context string from retrieved chunks
 */
export function buildContextFromChunks(chunks: RetrievedChunk[]): string {
    return chunks
        .map(chunk => `## ${chunk.title}\n\n${chunk.content}`)
        .join('\n\n---\n\n')
}

/**
 * Get retrieval stats for monitoring
 */
export function getRetrievalStats(result: RetrievalResult) {
    return {
        chunkCount: result.chunks.length,
        totalTokens: result.totalTokens,
        queryTimeMs: result.queryTime,
        avgSimilarity: result.chunks.length > 0
            ? result.chunks.reduce((sum, c) => sum + c.similarity, 0) / result.chunks.length
            : 0,
        categories: [...new Set(result.chunks.map(c => c.category))],
    }
}
