/**
 * Dynamic System Prompt Builder
 * 
 * Builds optimized system prompts using retrieved RAG chunks
 */

import type { CompactTaxContext } from '@/db/schema/tax-context'
import { retrieveRelevantChunks, buildContextFromChunks, type RetrievalResult } from './retriever'

/**
 * Core prompt that is always included (minimal, ~200 tokens)
 */
const CORE_PROMPT = `You are TaxBracket AI, an advanced financial analyst and tax assistant specializing in Nigerian financial regulations, tax codes, and banking practices.

Your core mission: Analyze Nigerian bank statements, provide actionable financial insights, calculate taxes based on the Nigeria Tax Act 2025 (effective January 1, 2026), and deliver professional financial advice.

CRITICAL RULES:
1. You MUST ALWAYS use the generate_ui_blocks tool for EVERY response
2. Never provide plain text responses without using the tool
3. Use Nigerian Naira (₦) for all currency values
4. Format numbers with commas: ₦1,500,000.00
5. Be professional, accurate, and action-oriented`

/**
 * Build a dynamic system prompt using RAG
 */
export async function buildDynamicPrompt(
    query: string,
    taxContext: CompactTaxContext | null,
    options: {
        maxTokens?: number
        includeCore?: boolean
        userId?: string
        fileId?: string | string[]
    } = {}
): Promise<{
    prompt: string
    retrieval: RetrievalResult
    stats: {
        coreTokens: number
        ragTokens: number
        contextTokens: number
        totalTokens: number
    }
}> {
    const { maxTokens = 3000, includeCore = true, userId, fileId } = options

    // Reserve tokens for core prompt and context
    const coreTokens = estimateTokens(CORE_PROMPT)
    const contextSection = buildContextSection(taxContext)
    const contextTokens = estimateTokens(contextSection)
    const ragBudget = maxTokens - coreTokens - contextTokens - 200 // 200 buffer

    // Retrieve relevant chunks
    const retrieval = await retrieveRelevantChunks(query, {
        limit: 8,
        minSimilarity: 0.4,
        includeCore: includeCore,
        maxTokens: Math.max(ragBudget, 500),
        userId,
        fileId,
    })

    // Build RAG context
    const ragContext = buildContextFromChunks(retrieval.chunks)
    const ragTokens = estimateTokens(ragContext)

    // Assemble the prompt
    const prompt = `${CORE_PROMPT}

# RELEVANT KNOWLEDGE

${ragContext}

${contextSection}`

    return {
        prompt,
        retrieval,
        stats: {
            coreTokens,
            ragTokens,
            contextTokens,
            totalTokens: coreTokens + ragTokens + contextTokens,
        },
    }
}

/**
 * Build the financial context section from tax context
 */
function buildContextSection(taxContext: CompactTaxContext | null): string {
    if (!taxContext) {
        return `# FINANCIAL DATA CONTEXT
    
    No aggregated summary is available. However, check the # RELEVANT KNOWLEDGE section for specific transaction summaries and patterns retrieved from uploaded files. Use those chunks to provide analysis. If no relevant chunks are found, encourage the user to upload a statement to begin.`
    }

    return `# FINANCIAL DATA CONTEXT (AUTHORITATIVE)

Use this EXACT data for calculations. Do not make up numbers.

\`\`\`json
${JSON.stringify(taxContext, null, 2)}
\`\`\`

CRITICAL REMINDERS:
- Use ONLY the numbers from this context
- If a value is null or missing, indicate data is unavailable
- Never fabricate transaction data
- All calculations must be traceable to this data`
}

/**
 * Build a minimal prompt for simple queries (greetings, etc.)
 */
export function buildMinimalPrompt(): string {
    return `You are TaxBracket AI, a friendly Nigerian financial assistant.

RULES:
1. Always use the generate_ui_blocks tool
2. Keep responses concise and welcoming
3. Mention your capabilities: bank statement analysis, tax calculations, bank charge identification
4. Encourage users to upload their bank statements

CAPABILITIES:
- Bank statement analysis (PDF, CSV, XLSX)
- Tax calculations based on Nigeria Tax Act 2025
- Bank charge and fee identification
- Financial insights and recommendations`
}

/**
 * Get the full system prompt (fallback when RAG fails)
 */
import { systemPrompt } from '@/server/data/system-prompt'

export function getFullSystemPrompt(taxContext: CompactTaxContext | null): string {
    return systemPrompt(taxContext)
}

/**
 * Estimate token count
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
}

/**
 * Create an index file for the RAG module
 */
export { retrieveRelevantChunks, buildContextFromChunks }
