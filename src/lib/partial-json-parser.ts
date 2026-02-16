/**
 * Partial JSON Parser for Streaming Block Extraction
 * 
 * Parses incomplete JSON from streaming tool invocations to extract
 * complete blocks as they arrive, enabling incremental UI updates.
 */

export interface UIBlock {
    type: string
    [key: string]: any
}

export interface PartialParseResult {
    blocks: UIBlock[]
    isComplete: boolean
    partialBlock?: Partial<UIBlock>
    error?: string
}

/**
 * Parse partial JSON string and extract complete blocks.
 * Handles incomplete JSON from streaming tool invocations.
 */
export function parsePartialJSON(jsonString: string): PartialParseResult {
    if (!jsonString || jsonString.trim() === '') {
        return { blocks: [], isComplete: false }
    }

    // Try complete parse first
    try {
        const parsed = JSON.parse(jsonString)
        return {
            blocks: extractBlocks(parsed),
            isComplete: true,
        }
    } catch {
        // JSON is incomplete, try to extract partial blocks
    }

    // Extract blocks from partial JSON
    return extractPartialBlocks(jsonString)
}

/**
 * Extract blocks from a fully parsed JSON object
 */
function extractBlocks(data: any): UIBlock[] {
    if (!data) return []

    // Direct blocks array
    if (Array.isArray(data)) {
        return data.filter(isValidBlock)
    }

    // Nested in common locations
    if (data.blocks && Array.isArray(data.blocks)) {
        return data.blocks.filter(isValidBlock)
    }

    if (data.contents && Array.isArray(data.contents)) {
        return data.contents.filter(isValidBlock)
    }

    // Single block object
    if (isValidBlock(data)) {
        return [data]
    }

    return []
}

/**
 * Check if an object is a valid UI block
 */
function isValidBlock(obj: any): obj is UIBlock {
    return obj && typeof obj === 'object' && typeof obj.type === 'string'
}

/**
 * Check if a partial block has enough data to render
 */
export function isRenderableBlock(block: Partial<UIBlock>): block is UIBlock {
    if (!block.type) return false

    switch (block.type) {
        case 'text':
            return typeof block.content === 'string' && block.content.length > 0
        case 'section':
            return typeof block.title === 'string'
        case 'chart':
            return Array.isArray(block.data)
        case 'data-table':
            return Array.isArray(block.data)
        case 'summary':
            return typeof block.title === 'string'
        default:
            return true
    }
}

/**
 * Extract complete blocks from partial JSON string
 */
function extractPartialBlocks(jsonString: string): PartialParseResult {
    const blocks: UIBlock[] = []
    let partialBlock: Partial<UIBlock> | undefined

    // Look for the blocks array pattern
    const blocksMatch = jsonString.match(/"blocks"\s*:\s*\[/i) ||
                        jsonString.match(/"contents"\s*:\s*\[/i)

    if (blocksMatch) {
        // Find start of array
        const arrayStart = jsonString.indexOf('[', blocksMatch.index || 0)
        if (arrayStart === -1) {
            return { blocks: [], isComplete: false }
        }

        // Extract array content
        const arrayContent = jsonString.slice(arrayStart)
        const extracted = extractObjectsFromArray(arrayContent)
        
        blocks.push(...extracted.completeObjects.filter(isValidBlock))
        if (extracted.partialObject && Object.keys(extracted.partialObject).length > 0) {
            partialBlock = extracted.partialObject
        }

        return { 
            blocks, 
            isComplete: false, 
            partialBlock 
        }
    }

    // Try direct array extraction
    if (jsonString.trim().startsWith('[')) {
        const extracted = extractObjectsFromArray(jsonString)
        blocks.push(...extracted.completeObjects.filter(isValidBlock))
        if (extracted.partialObject) {
            partialBlock = extracted.partialObject
        }
    }

    return { blocks, isComplete: false, partialBlock }
}

/**
 * Extract complete JSON objects from an array string
 */
function extractObjectsFromArray(arrayContent: string): {
    completeObjects: any[]
    partialObject?: any
} {
    const completeObjects: any[] = []
    let partialObject: any = undefined

    // Track bracket depth to find complete objects
    let depth = 0
    let objectStart = -1
    let inString = false
    let escapeNext = false

    for (let i = 0; i < arrayContent.length; i++) {
        const char = arrayContent[i]

        // Handle string boundaries
        if (escapeNext) {
            escapeNext = false
            continue
        }

        if (char === '\\') {
            escapeNext = true
            continue
        }

        if (char === '"' && !escapeNext) {
            inString = !inString
            continue
        }

        if (inString) continue

        // Track object depth
        if (char === '{') {
            if (depth === 0) {
                objectStart = i
            }
            depth++
        } else if (char === '}') {
            depth--
            if (depth === 0 && objectStart !== -1) {
                // Complete object found
                const objectStr = arrayContent.slice(objectStart, i + 1)
                try {
                    const obj = JSON.parse(objectStr)
                    completeObjects.push(obj)
                } catch {
                    // Failed to parse, might be incomplete
                }
                objectStart = -1
            }
        }
    }

    // Check for partial object at the end
    if (depth > 0 && objectStart !== -1) {
        const partialStr = arrayContent.slice(objectStart)
        partialObject = tryParsePartialObject(partialStr)
    }

    return { completeObjects, partialObject }
}

/**
 * Try to extract partial data from an incomplete JSON object
 */
function tryParsePartialObject(partialStr: string): any | undefined {
    // Try adding closing braces
    let fixedStr = partialStr
    const openBraces = (partialStr.match(/{/g) || []).length
    const closeBraces = (partialStr.match(/}/g) || []).length
    const missingBraces = openBraces - closeBraces

    if (missingBraces > 0) {
        // Remove trailing comma if present
        fixedStr = fixedStr.replace(/,\s*$/, '')
        // Add closing braces
        fixedStr += '}'.repeat(missingBraces)

        try {
            return JSON.parse(fixedStr)
        } catch {
            // Still can't parse
        }
    }

    // Extract type at minimum
    const typeMatch = partialStr.match(/"type"\s*:\s*"([^"]+)"/)
    if (typeMatch) {
        return { type: typeMatch[1], _partial: true }
    }

    return undefined
}

/**
 * Merge new blocks with existing blocks, preserving order and state
 */
export function mergeBlocks(
    existing: UIBlock[],
    incoming: UIBlock[]
): UIBlock[] {
    // If no existing blocks, return incoming
    if (existing.length === 0) return incoming

    // If incoming has same length, update in place
    if (incoming.length === existing.length) {
        return incoming.map((block, i) => ({
            ...existing[i],
            ...block,
        }))
    }

    // If incoming has more, append new ones
    if (incoming.length > existing.length) {
        const updated = existing.map((block, i) => ({
            ...block,
            ...incoming[i],
        }))
        const newBlocks = incoming.slice(existing.length)
        return [...updated, ...newBlocks]
    }

    // Otherwise return incoming (shouldn't happen normally)
    return incoming
}
