import { UIMessage } from 'ai'
import type { CompactTaxContext } from '@/db/schema/tax-context'

export type QueryComplexity = 'simple' | 'complex'
export type QueryIntent = 'greeting' | 'calculation' | 'general' | 'upload_request'

export interface ClassificationResult {
    complexity: QueryComplexity
    intent: QueryIntent
    confidence: number
    reasoning: string
}

export function classifyQuery(
    messages: UIMessage[],
    context: CompactTaxContext | null
): ClassificationResult {
    const lastMessage = messages[messages.length - 1]

    let content = ''
    if (lastMessage && lastMessage.role === 'user') {
        if ('parts' in lastMessage && Array.isArray(lastMessage.parts)) {
            content = lastMessage.parts
                .filter(p => p.type === 'text')
                .map(p => p.text)
                .join('')
        } else {
            content = (lastMessage as any).content || ''
        }
    }

    const lowerContent = content.toLowerCase().trim()
    const wordCount = content.split(/\s+/).length

    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup']
    if (greetings.includes(lowerContent) || (wordCount <= 3 && greetings.some(g => lowerContent.includes(g)))) {
        return {
            complexity: 'simple',
            intent: 'greeting',
            confidence: 0.95,
            reasoning: 'Matches known greeting patterns'
        }
    }

    if (!context && (lowerContent.includes('tax') || lowerContent.includes('calculate') || lowerContent.includes('analysis'))) {
        return {
            complexity: 'simple',
            intent: 'upload_request',
            confidence: 0.9,
            reasoning: 'Tax query but no context available'
        }
    }

    const calcKeywords = [
        'calculate', 'compute', 'estimate', 'tax', 'liability',
        'deduction', 'relief', 'breakdown', 'chart', 'graph',
        'trend', 'compare', 'analysis', 'forecast', 'table',
        'data', 'overview', 'summary'
    ]

    const numberPattern = /\d+(?:,\d{3})*(?:\.\d+)?|[0-9]+k|[0-9]+m/i

    const hasCalcKeyword = calcKeywords.some(k => lowerContent.includes(k))
    const hasNumbers = numberPattern.test(content)

    if (hasCalcKeyword || hasNumbers || (context && wordCount > 5)) {
        return {
            complexity: 'complex',
            intent: 'calculation',
            confidence: 0.8,
            reasoning: 'Contains calculation keywords or numerical data'
        }
    }

    return {
        complexity: 'simple',
        intent: 'general',
        confidence: 0.5,
        reasoning: 'No specific complexity indicators found'
    }
}
