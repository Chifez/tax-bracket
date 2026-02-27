import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { db } from '@/db'
import { files, transactions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/server/lib/s3'
import { parseFile } from '@/server/lib/parser'
import { normalizeRows } from '@/server/lib/normalizer'
import { generateTransactionHash, deduplicateBatch, deduplicateAgainstExisting } from '@/server/lib/deduplicator'
import { generateSemanticSummaries, embedSummaries, chunkText } from '@/server/lib/rag/semantic-enricher'
import { Readable } from 'stream'

export async function startFileProcessor() {
    const queue = await getQueue()

    console.log(`Starting worker for ${QUEUE_NAMES.PARSE_FILE}...`)

    await queue.createQueue(QUEUE_NAMES.PARSE_FILE)
    await queue.work(QUEUE_NAMES.PARSE_FILE, async (jobs: any[]) => {
        for (const job of jobs) {
            const { fileId, key, bucket, mimeType, userId, taxYear, batchId, bankName } = job.data

            console.log(`Processing file ${fileId} (${mimeType})...`)

            try {
                // 1. Update status to processing
                await db.update(files)
                    .set({ status: 'processing' })
                    .where(eq(files.id, fileId))

                // 2. Download from S3
                const command = new GetObjectCommand({
                    Bucket: bucket,
                    Key: key
                })
                const response = await s3Client.send(command)

                if (!response.Body) {
                    throw new Error('Empty body from S3')
                }

                // Convert stream to buffer
                const stream = response.Body as Readable
                const chunks: Buffer[] = []
                for await (const chunk of stream) {
                    chunks.push(Buffer.from(chunk))
                }
                const buffer = Buffer.concat(chunks)

                // 3. Parse file into structured data
                const parsed = await parseFile(buffer, mimeType)

                // 4. Normalize rows into canonical transactions
                const normalized = normalizeRows(parsed.rows, parsed.headers, bankName || null)

                console.log(`  Parsed ${parsed.rows.length} rows → ${normalized.length} normalized transactions`)

                // 5. Deduplicate within batch
                const batchDedup = deduplicateBatch(normalized)
                console.log(`  In-batch dedup: ${batchDedup.duplicateCount} duplicates removed`)

                // 6. Deduplicate against existing DB transactions for this user+year
                let uniqueTransactions = batchDedup.unique
                if (uniqueTransactions.length > 0 && userId && taxYear) {
                    const existingRows = await db.select({ hash: transactions.deduplicationHash })
                        .from(transactions)
                        .where(eq(transactions.userId, userId))

                    const existingHashes = new Set(existingRows.map(r => r.hash))
                    const dbDedup = deduplicateAgainstExisting(uniqueTransactions, existingHashes)
                    console.log(`  Cross-file dedup: ${dbDedup.duplicateCount} duplicates removed`)
                    uniqueTransactions = dbDedup.unique
                }

                // 7. Insert transactions into DB
                if (uniqueTransactions.length > 0 && userId) {
                    const txRecords = uniqueTransactions.map(tx => ({
                        userId,
                        fileId,
                        batchId: batchId || null,
                        taxYear: taxYear || tx.date.getFullYear(),
                        date: tx.date,
                        description: tx.description,
                        amount: tx.amount.toFixed(2),
                        direction: tx.direction as 'credit' | 'debit',
                        category: tx.category,
                        subCategory: tx.subCategory,
                        currency: tx.currency,
                        bankName: tx.bankName,
                        rawDescription: tx.rawDescription,
                        normalizedDescription: tx.description,
                        deduplicationHash: generateTransactionHash(tx),
                    }))

                    // Insert in batches of 100 to avoid query size limits
                    const BATCH_SIZE = 100
                    for (let i = 0; i < txRecords.length; i += BATCH_SIZE) {
                        const batch = txRecords.slice(i, i + BATCH_SIZE)
                        await db.insert(transactions).values(batch)
                    }

                    console.log(`  Inserted ${uniqueTransactions.length} transactions`)
                }

                // 8. Generate and embed semantic summaries (Enrichment)
                if (uniqueTransactions.length > 0) {
                    try {
                        console.log(`  Generating semantic summaries for ${uniqueTransactions.length} transactions...`)
                        // We need to fetch the newly inserted records to get their IDs and full context if needed, 
                        // but for enrichment we can use the uniqueTransactions array directly.
                        // Map back to a full Transaction type for the enricher.
                        const summaries = await generateSemanticSummaries(uniqueTransactions as any)
                        await embedSummaries(userId, fileId, summaries)
                        console.log(`  Enrichment complete: ${summaries.length} chunks created.`)
                    } catch (enrichError) {
                        console.error('  Semantic enrichment failed (non-critical):', enrichError)
                    }
                }

                // 8.5 Embed raw document text as context
                if (parsed.rawText && parsed.rawText.trim().length > 0) {
                    try {
                        console.log(`  Chunking raw document text (${parsed.rawText.length} chars)...`)
                        const rawChunks = chunkText(parsed.rawText, 1500)
                        const textSummaries = rawChunks.map((content, idx) => ({
                            title: `Document Content (Part ${idx + 1})`,
                            content
                        }))

                        if (textSummaries.length > 0) {
                            await embedSummaries(userId, fileId, textSummaries)
                            console.log(`  Raw text embedded: ${textSummaries.length} chunks created.`)
                        }
                    } catch (textError) {
                        console.error('  Raw text embedding failed (non-critical):', textError)
                    }
                }

                // 9. Update file record
                await db.update(files)
                    .set({
                        status: 'completed',
                        extractedText: parsed.rawText,
                        updatedAt: new Date()
                    })
                    .where(eq(files.id, fileId))

                // 9. Queue aggregation if we have transactions
                if (uniqueTransactions.length > 0 && userId && taxYear) {
                    await queue.send(QUEUE_NAMES.COMPUTE_AGGREGATES, {
                        userId,
                        taxYear,
                        batchId,
                    })
                }

                console.log(`File ${fileId} processed successfully.`)

            } catch (error: any) {
                console.error(`Failed to process file ${fileId}:`, error)

                await db.update(files)
                    .set({
                        status: 'failed',
                        metadata: { error: error.message } as any
                    })
                    .where(eq(files.id, fileId))

                throw error // Retry logic handled by pg-boss
            }
        }
    })
}
