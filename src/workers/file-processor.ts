import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { db } from '@/db'
import { files } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/server/lib/s3'
import { parseFile } from '@/server/lib/parser'
import { Readable } from 'stream'

export async function startFileProcessor() {
    const queue = await getQueue()

    console.log(`Starting worker for ${QUEUE_NAMES.PARSE_FILE}...`)

    await queue.work(QUEUE_NAMES.PARSE_FILE, async (job: any) => {
        const { fileId, key, bucket, mimeType } = job.data


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

            // 3. Parse
            const extractedText = await parseFile(buffer, mimeType)

            // 4. Update DB
            await db.update(files)
                .set({
                    status: 'completed',
                    extractedText,
                    updatedAt: new Date()
                })
                .where(eq(files.id, fileId))

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
    })
}
