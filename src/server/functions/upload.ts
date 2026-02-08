import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { unauthorized } from '@/server/lib/error'
import { getUploadUrlSchema, registerFileSchema } from '@/server/validators/upload'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, CLOUDFLARE } from '@/server/lib/s3'
import { db } from '@/db'
import { files } from '@/db/schema'
import { getQueue, QUEUE_NAMES } from '@/server/lib/queue'
import { v4 as uuidv4 } from 'uuid'

/**
 * Generate a presigned URL for uploading a file to S3
 */
export const getUploadUrl = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => getUploadUrlSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        // Create a unique key for the file
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

        // Generate presigned URL
        const url = await getSignedUrl(s3Client, command, { expiresIn: CLOUDFLARE.R2.PRESIGN_EXPIRATION_TIME })

        return { url, key, fileId }
    })

/**
 * Register the file in the database and queue for processing
 */
export const registerFile = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => registerFileSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) throw unauthorized()

        // Construct the public URL
        // If CLOUDFLARE_BUCKET_DOMAIN is set, use it (custom domain).
        // Otherwise, fallback to R2 dev URL structure (though usually requires auth or public bucket).
        // For private buckets, we might need a presigned GET url, but here we are storing a "permanent" URL.
        // Assuming the bucket is public or we have a worker.
        const baseUrl = CLOUDFLARE.R2.BUCKET_DOMAIN
            ? (CLOUDFLARE.CONFIGS.BUCKET_DOMAIN ? `https://${CLOUDFLARE.CONFIGS.BUCKET_DOMAIN}` : `${CLOUDFLARE.R2.BUCKET_DOMAIN}/${CLOUDFLARE.R2.BUCKET}`)
            : `https://${CLOUDFLARE.R2.BUCKET}.r2.cloudflarestorage.com`

        // Fix: If using custom domain, the format is usually https://custom.domain.com/key
        // If using R2.dev (subdomain), it's https://pub-<hash>.r2.dev/key -> this is for public access enabled.
        // The user provided config implies `CLOUDFLARE_BUCKET_DOMAIN` might be the custom domain.

        const publicUrl = process.env.CLOUDFLARE_BUCKET_DOMAIN
            ? `${process.env.CLOUDFLARE_BUCKET_DOMAIN}/${data.key}`
            : `${baseUrl}/${data.key}`

        // 1. Create file record
        const [newFile] = await db.insert(files).values({
            id: uuidv4(), // Or allow client to pass ID if consistent
            userId: user.id,
            chatId: data.chatId || null,
            url: publicUrl,
            status: 'pending',
            metadata: {
                originalName: data.filename,
                mimeType: data.contentType,
                size: data.size,
                s3Key: data.key
            }
        }).returning()

        // 2. Add to Queue
        const queue = await getQueue()
        await queue.send(QUEUE_NAMES.PARSE_FILE, {
            fileId: newFile.id,
            key: data.key,
            bucket: CLOUDFLARE.R2.BUCKET,
            mimeType: data.contentType
        })

        return { file: newFile }
    })
