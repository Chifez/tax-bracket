import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { db } from '@/db'
import { knowledgeChunks } from '@/db/schema'
import { generateEmbedding } from './embeddings'
import type { Transaction } from '@/db/schema/transactions'

/**
 * Splits raw text into chunks suitable for embedding
 */
export function chunkText(text: string, maxLen = 1500): string[] {
    if (!text || text.trim().length === 0) return []

    // Split by paragraphs or double newlines
    const paragraphs = text.split(/\n\s*\n/)
    const chunks: string[] = []
    let currentChunk = ''

    for (const p of paragraphs) {
        if (currentChunk.length + p.length > maxLen && currentChunk.length > 0) {
            chunks.push(currentChunk.trim())
            currentChunk = ''
        }
        currentChunk += p + '\n\n'
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim())
    }

    return chunks
}

/**
 * Generates semantic summaries and insights from a batch of transactions
 */
export async function generateSemanticSummaries(transactions: Transaction[]) {
    if (transactions.length === 0) return []

    const txSample = transactions.slice(0, 100).map(tx => ({
        date: tx.date,
        amount: tx.amount,
        direction: tx.direction,
        description: tx.description,
        category: tx.category,
        subCategory: tx.subCategory
    }))

    const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `You are a financial data analyst. Analyze these transactions and provide:
        1. A high-level summary of spending patterns.
        2. A monthly rollup of income vs expenses.
        3. Identification of any unusual or suspicious bank charges.
        4. Key tax-relevant insights (e.g., deductible business expenses, salary trends).
        
        Format your response as a series of standalone "knowledge chunks". 
        Each chunk should have a TITLE and CONTENT.
        Separate chunks with "---CHUNK-BOUNDARY---".`,
        prompt: `Transactions (Sample of ${txSample.length}):\n${JSON.stringify(txSample, null, 2)}`
    })

    return text.split('---CHUNK-BOUNDARY---')
        .map(raw => {
            const lines = raw.trim().split('\n')
            const title = lines[0]?.replace(/^TITLE:\s*/i, '').trim() || 'Financial Analysis'
            const content = lines.slice(1).join('\n').trim()
            return { title, content }
        })
        .filter(c => c.content.length > 50)
}

/**
 * Embeds semantic summaries into the knowledge base
 */
export async function embedSummaries(userId: string, fileId: string, summaries: { title: string, content: string }[]) {
    console.log(`[Enricher] Embedding ${summaries.length} summaries for file ${fileId}...`)

    for (const summary of summaries) {
        const embedding = await generateEmbedding(summary.content)

        await db.insert(knowledgeChunks).values({
            chunkId: `summary-${fileId}-${crypto.randomUUID().slice(0, 8)}`,
            userId,
            fileId,
            title: summary.title,
            content: summary.content,
            category: 'financial_summary',
            embedding,
            priority: 8,
            tokenCount: Math.ceil(summary.content.length / 4)
        })
    }
}
