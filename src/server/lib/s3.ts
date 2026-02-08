import { S3Client } from '@aws-sdk/client-s3'

// Cloudflare R2 Configuration
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY
const bucketName = process.env.S3_BUCKET_NAME || 'taxbracket-uploads'
const bucketDomain = process.env.CLOUDFLARE_BUCKET_DOMAIN

export const CLOUDFLARE = {
    CONFIGS: {
        BUCKET_DOMAIN: bucketDomain,
        ACCESS_KEY: accessKeyId,
        SECRET_ACCESS_KEY: secretAccessKey,
        ACCOUNT_ID: accountId
    },
    R2: {
        BUCKET: bucketName,
        BUCKET_DOMAIN: bucketDomain
            ? bucketDomain
            : (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined),
        PRESIGN_EXPIRATION_TIME: 60 * 60, // 1 hour
        DOWNLOAD_EXPIRATION_TIME: 60 * 60 * 3 // 3 hours
    }
} as const;

if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('Storage credentials are not fully set in .env for Cloudflare R2')
}

export const s3Client = new S3Client({
    region: 'auto',
    endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
    credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
    },
})

// Export for backward compatibility if needed, but prefer CLOUDFLARE.R2.BUCKET
export const BUCKET_NAME = CLOUDFLARE.R2.BUCKET

