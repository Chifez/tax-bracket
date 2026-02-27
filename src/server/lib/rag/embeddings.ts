/**
 * Embedding utilities for RAG system
 * Uses OpenAI text-embedding-3-small for efficient, low-cost embeddings
 */

import OpenAI from 'openai'
import { db } from '@/db'
import { knowledgeChunks as knowledgeChunksTable } from '@/db/schema'
import { knowledgeChunks } from './knowledge-chunks'
import { eq, sql } from 'drizzle-orm'

let _openai: OpenAI | null = null
function getOpenAI() {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in environment variables')
        }
        _openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }
    return _openai
}

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate embedding for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await getOpenAI().embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
    })

    return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await getOpenAI().embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
    })

    return response.data.map(d => d.embedding)
}

/**
 * Estimate token count for a text (rough approximation)
 */
function estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4)
}

/**
 * Seed the knowledge chunks table with embeddings
 */
export async function seedKnowledgeChunks(): Promise<{
    inserted: number
    updated: number
    errors: string[]
}> {
    const results = {
        inserted: 0,
        updated: 0,
        errors: [] as string[],
    }

    console.log(`Seeding ${knowledgeChunks.length} knowledge chunks...`)

    for (const chunk of knowledgeChunks) {
        try {
            // Generate embedding for this chunk
            const embedding = await generateEmbedding(chunk.content)
            const tokenCount = estimateTokenCount(chunk.content)

            // Check if chunk already exists
            const existing = await db.query.knowledgeChunks.findFirst({
                where: eq(knowledgeChunksTable.chunkId, chunk.id),
            })

            if (existing) {
                // Update existing chunk
                await db.update(knowledgeChunksTable)
                    .set({
                        title: chunk.title,
                        content: chunk.content,
                        category: chunk.category,
                        tags: chunk.tags,
                        priority: chunk.priority,
                        embedding: embedding,
                        tokenCount,
                        version: existing.version + 1,
                        updatedAt: new Date(),
                    })
                    .where(eq(knowledgeChunksTable.chunkId, chunk.id))

                results.updated++
            } else {
                // Insert new chunk
                await db.insert(knowledgeChunksTable).values({
                    chunkId: chunk.id,
                    title: chunk.title,
                    content: chunk.content,
                    category: chunk.category,
                    tags: chunk.tags,
                    priority: chunk.priority,
                    embedding: embedding,
                    tokenCount,
                })

                results.inserted++
            }

            console.log(`  ✓ ${chunk.id} (${tokenCount} tokens)`)
        } catch (error) {
            console.error(`  ✗ ${chunk.id}:`, error)
            results.errors.push(chunk.id)
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`\nSeeding complete:`)
    console.log(`  Inserted: ${results.inserted}`)
    console.log(`  Updated: ${results.updated}`)
    console.log(`  Errors: ${results.errors.length}`)

    return results
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
    queryEmbedding: number[],
    limit: number = 5,
    minSimilarity: number = 0.5,
    filters?: {
        userId?: string
        fileId?: string | string[]
    }
): Promise<{
    chunkId: string
    title: string
    content: string
    category: string
    similarity: number
}[]> {
    // Use raw SQL for vector similarity search
    const results = await db.execute(sql`
        SELECT 
            chunk_id,
            title,
            content,
            category,
            1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM knowledge_chunks
        WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${minSimilarity}
        ${filters?.userId ? sql`AND user_id = ${filters.userId}` : sql``}
        ${filters?.fileId ? (
            Array.isArray(filters.fileId)
                ? sql`AND file_id IN (${sql.join(filters.fileId, sql`, `)})`
                : sql`AND file_id = ${filters.fileId}`
        ) : sql``}
        ORDER BY similarity DESC
        LIMIT ${limit}
    `)

    return results.rows.map((row: any) => ({
        chunkId: row.chunk_id,
        title: row.title,
        content: row.content,
        category: row.category,
        similarity: parseFloat(row.similarity),
    }))
}

/**
 * Get chunk by ID from database
 */
export async function getChunkById(chunkId: string) {
    return db.query.knowledgeChunks.findFirst({
        where: eq(knowledgeChunksTable.chunkId, chunkId),
    })
}

/**
 * Get all chunks by category
 */
export async function getChunksByCategory(category: string) {
    return db.execute(sql`
        SELECT * FROM knowledge_chunks
        WHERE category = ${category}
        ORDER BY priority DESC
    `)
}
