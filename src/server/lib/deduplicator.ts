import { createHash } from 'crypto'
import type { NormalizedTransaction } from './normalizer'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface DeduplicationResult {
    unique: NormalizedTransaction[]
    duplicateCount: number
    duplicateHashes: string[]
}

// -------------------------------------------------------------------
// Hash Generation
// -------------------------------------------------------------------

/**
 * Generate a deterministic hash for a transaction.
 * Uses: date + amount + direction + bankName + description (first 50 chars)
 * This identifies the "same" transaction across overlapping statements.
 */
export function generateTransactionHash(tx: NormalizedTransaction): string {
    const dateStr = tx.date.toISOString().split('T')[0] // YYYY-MM-DD
    const amountStr = tx.amount.toFixed(2)
    const desc = (tx.description || '').toLowerCase().slice(0, 50).trim()
    const bank = (tx.bankName || '').toLowerCase().trim()

    const input = `${dateStr}|${amountStr}|${tx.direction}|${bank}|${desc}`
    return createHash('sha256').update(input).digest('hex')
}

// -------------------------------------------------------------------
// Deduplication (in-batch)
// -------------------------------------------------------------------

/**
 * Remove duplicates within a batch of newly parsed transactions.
 */
export function deduplicateBatch(
    transactions: NormalizedTransaction[],
): DeduplicationResult {
    const seen = new Set<string>()
    const unique: NormalizedTransaction[] = []
    const duplicateHashes: string[] = []

    for (const tx of transactions) {
        const hash = generateTransactionHash(tx)
        if (seen.has(hash)) {
            duplicateHashes.push(hash)
        } else {
            seen.add(hash)
            unique.push(tx)
        }
    }

    return {
        unique,
        duplicateCount: duplicateHashes.length,
        duplicateHashes,
    }
}

// -------------------------------------------------------------------
// Deduplication against existing DB hashes
// -------------------------------------------------------------------

/**
 * Filter out transactions that already exist in the database.
 * @param transactions - Newly parsed transactions
 * @param existingHashes - Set of hashes already in the transactions table
 */
export function deduplicateAgainstExisting(
    transactions: NormalizedTransaction[],
    existingHashes: Set<string>,
): DeduplicationResult {
    const unique: NormalizedTransaction[] = []
    const duplicateHashes: string[] = []

    for (const tx of transactions) {
        const hash = generateTransactionHash(tx)
        if (existingHashes.has(hash)) {
            duplicateHashes.push(hash)
        } else {
            unique.push(tx)
        }
    }

    return {
        unique,
        duplicateCount: duplicateHashes.length,
        duplicateHashes,
    }
}
