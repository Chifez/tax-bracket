import { getUploadUrl, registerFile } from '@/server/functions/upload'

export interface UploadedFileResult {
    fileId: string
    key: string
    url: string
}

/**
 * Uploads a list of files to S3 via presigned URLs and registers them
 */
export async function uploadFiles(files: File[]): Promise<UploadedFileResult[]> {
    const results: UploadedFileResult[] = []

    for (const file of files) {
        // 1. Get Presigned URL
        const { url, key, fileId } = await getUploadUrl({
            data: {
                filename: file.name,
                contentType: file.type,
                size: file.size
            }
        })

        // 2. Upload to S3
        await fetch(url, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        })

        // 3. Register File
        await registerFile({
            data: {
                key,
                filename: file.name,
                contentType: file.type,
                size: file.size,
                // chatId can be passed if known, but for new chats it is null initially
            }
        })

        results.push({
            fileId,
            key,
            url: url.split('?')[0] // Clean URL
        })
    }

    return results
}
