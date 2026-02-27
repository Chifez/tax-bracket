import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { unauthorized } from '@/server/lib/error'
import { getUploadUrlSchema, registerFileSchema, deleteFileSchema, getFileStatusSchema } from '@/server/validators/upload'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, CLOUDFLARE } from '@/server/lib/s3'
import { db } from '@/db'
import { files } from '@/db/schema'
import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'
import { Readable } from 'stream'
import { eq, and } from 'drizzle-orm'
import { parseFile } from '@/server/lib/parser'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Generate a presigned URL for uploading a file to S3
 */
export const getUploadUrl = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => getUploadUrlSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const fileId = uuidv4()
        const ext = data.filename.split('.').pop()
        const key = `${user.id}/${fileId}.${ext}`

        const command = new PutObjectCommand({
            Bucket: CLOUDFLARE.R2.BUCKET,
            Key: key,
            ContentType: data.contentType,
            Metadata: {
                originalName: data.filename,
                userId: user.id
            }
        })

        const url = await getSignedUrl(s3Client, command, { expiresIn: CLOUDFLARE.R2.PRESIGN_EXPIRATION_TIME })
        return { url, key, fileId }
    })

/**
 * Register the file in the database, upload to OpenAI Files API, and queue for processing
 */
export const registerFile = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => registerFileSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const baseUrl = CLOUDFLARE.R2.BUCKET_DOMAIN
            ? (CLOUDFLARE.CONFIGS.BUCKET_DOMAIN ? `https://${CLOUDFLARE.CONFIGS.BUCKET_DOMAIN}` : `${CLOUDFLARE.R2.BUCKET_DOMAIN}/${CLOUDFLARE.R2.BUCKET}`)
            : `https://${CLOUDFLARE.R2.BUCKET}.r2.cloudflarestorage.com`

        const publicUrl = process.env.CLOUDFLARE_BUCKET_DOMAIN
            ? `${process.env.CLOUDFLARE_BUCKET_DOMAIN}/${data.key}`
            : `${baseUrl}/${data.key}`

        const taxYear = data.taxYear || new Date().getFullYear()

        // 1. Create the DB record immediately (so background jobs can reference it)
        const [newFile] = await db.insert(files).values({
            id: uuidv4(),
            userId: user.id,
            chatId: data.chatId || null,
            batchId: data.batchId || null,
            url: publicUrl,
            status: 'pending',
            taxYear,
            bankName: data.bankName || null,
            metadata: {
                originalName: data.filename,
                mimeType: data.contentType,
                size: data.size,
                s3Key: data.key
            }
        }).returning()

        // 2. In parallel: upload to OpenAI Files API and download + extract text
        const [openaiResult, extractResult] = await Promise.allSettled([
            uploadToOpenAI(data.key, data.filename, data.contentType, newFile.id),
            extractTextFromR2(data.key, data.contentType),
        ])

        if (openaiResult.status === 'rejected') {
            console.error(`[Upload] OpenAI Files API upload failed for ${newFile.id}:`, openaiResult.reason)
        }

        // Store extracted text immediately so the file is chat-ready
        const extractedText = extractResult.status === 'fulfilled' ? extractResult.value : null
        if (extractedText) {
            await db.update(files)
                .set({ extractedText, status: 'processing' })
                .where(eq(files.id, newFile.id))
            console.log(`[Upload] Text extracted for ${newFile.id} (${extractedText.length} chars)`)
        } else if (extractResult.status === 'rejected') {
            console.error(`[Upload] Text extraction failed for ${newFile.id}:`, extractResult.reason)
        }

        // 3. Queue background processing (normalize, deduplicate, aggregate)
        const queue = await getQueue()
        await queue.send(QUEUE_NAMES.PARSE_FILE, {
            fileId: newFile.id,
            key: data.key,
            bucket: CLOUDFLARE.R2.BUCKET,
            mimeType: data.contentType,
            userId: user.id,
            taxYear,
            batchId: data.batchId || null,
            bankName: data.bankName || null,
        })

        const updatedFile = await db.query.files.findFirst({ where: eq(files.id, newFile.id) })
        return { file: updatedFile ?? newFile }
    })

/**
 * Download file from R2 and upload to OpenAI Files API for native model reading.
 * Stores the resulting openai_file_id back into the DB.
 */
async function uploadToOpenAI(
    s3Key: string,
    filename: string,
    contentType: string,
    fileDbId: string,
): Promise<void> {
    // Download from R2
    const getCmd = new GetObjectCommand({ Bucket: CLOUDFLARE.R2.BUCKET, Key: s3Key })
    const s3Response = await s3Client.send(getCmd)
    if (!s3Response.Body) throw new Error('Empty body from R2')

    // Convert stream to buffer
    const stream = s3Response.Body as Readable
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    // Upload to OpenAI
    const blob = new Blob([buffer], { type: contentType })
    const file = new File([blob], filename, { type: contentType })
    const openaiFile = await openai.files.create({ file, purpose: 'assistants' })

    // Persist the openai_file_id
    await db.update(files)
        .set({ openaiFileId: openaiFile.id })
        .where(eq(files.id, fileDbId))

    console.log(`[Upload] OpenAI file ID ${openaiFile.id} stored for file ${fileDbId}`)
}

/**
 * Download file from R2 and extract text using the parser.
 * Returns the raw text string, or throws on failure.
 */
async function extractTextFromR2(s3Key: string, mimeType: string): Promise<string> {
    // Skip extraction for images — they don't have extractable text
    if (mimeType.startsWith('image/')) return ''

    const getCmd = new GetObjectCommand({ Bucket: CLOUDFLARE.R2.BUCKET, Key: s3Key })
    const s3Response = await s3Client.send(getCmd)
    if (!s3Response.Body) throw new Error('Empty body from R2')

    const stream = s3Response.Body as Readable
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    const parsed = await parseFile(buffer, mimeType)
    return parsed.rawText
}

/**
 * Delete a file from R2, OpenAI, and the database
 */
export const deleteFile = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => deleteFileSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const file = await db.query.files.findFirst({
            where: and(eq(files.id, data.fileId), eq(files.userId, user.id)),
        })

        if (!file) return { success: true }

        // 1. Delete from R2
        const s3Key = (file.metadata as any)?.s3Key
        if (s3Key) {
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: CLOUDFLARE.R2.BUCKET,
                    Key: s3Key,
                }))
            } catch (err) {
                console.error(`[Delete] Failed to delete R2 object ${s3Key}:`, err)
            }
        }

        // 2. Delete from OpenAI Files API
        if (file.openaiFileId) {
            try {
                await (openai.files as any).del(file.openaiFileId)
            } catch (err) {
                console.error(`[Delete] Failed to delete OpenAI file ${file.openaiFileId}:`, err)
            }
        }

        // 3. Delete DB record
        await db.delete(files)
            .where(and(eq(files.id, data.fileId), eq(files.userId, user.id)))

        console.log(`[Delete] File ${data.fileId} fully cleaned up`)
        return { success: true }
    })

/**
 * Get the processing status of a file
 */
export const getFileStatus = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => getFileStatusSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        const file = await db.query.files.findFirst({
            where: and(eq(files.id, data.fileId), eq(files.userId, user.id)),
            columns: {
                id: true,
                status: true,
            }
        })

        if (!file) throw new Error('File not found')

        return { status: file.status }
    })
