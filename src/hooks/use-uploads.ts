import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listBatches, createBatch, deleteBatch } from '@/server/functions/batch'
import { listUserFiles, deleteFile, listTransactions, getTransactionSummary } from '@/server/functions/transactions'
import { getUploadUrl, registerFile } from '@/server/functions/upload'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'

// -------------------------------------------------------------------
// Batches
// -------------------------------------------------------------------

export const useBatches = (taxYear?: number) => {
    return useQuery({
        queryKey: ['batches', taxYear],
        queryFn: () => listBatches({ data: { taxYear } }),
    })
}

export const useCreateBatch = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: { taxYear: number; label?: string }) =>
            createBatch({ data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches'] })
            toast.success('Upload batch created')
        },
        onError: (error: Error) => {
            toast.error('Failed to create batch: ' + error.message)
        },
    })
}

export const useDeleteBatch = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (batchId: string) =>
            deleteBatch({ data: { batchId } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches'] })
            toast.success('Batch deleted')
        },
    })
}

// -------------------------------------------------------------------
// Files
// -------------------------------------------------------------------

export const useUserFiles = (taxYear?: number) => {
    return useQuery({
        queryKey: ['user-files', taxYear],
        queryFn: () => listUserFiles({ data: { taxYear } }),
    })
}

export const useDeleteFile = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (fileId: string) =>
            deleteFile({ data: { fileId } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-files'] })
            queryClient.invalidateQueries({ queryKey: ['batches'] })
            toast.success('File deleted')
        },
    })
}

// -------------------------------------------------------------------
// File Upload (with progress tracking)
// -------------------------------------------------------------------

export const useFileUpload = () => {
    const queryClient = useQueryClient()
    const { addFile, updateFileStatus } = useChatStore()

    const uploadFile = async (
        file: File,
        options?: {
            taxYear?: number
            batchId?: string
            bankName?: string
            chatId?: string
        }
    ) => {
        const fileId = crypto.randomUUID()

        // Add to local store for immediate UI feedback
        addFile({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString(),
        })

        try {
            // 1. Get presigned URL
            updateFileStatus(fileId, 'uploading', 10)
            const { url, key } = await getUploadUrl({
                data: {
                    filename: file.name,
                    contentType: file.type,
                    size: file.size,
                },
            })

            // 2. Upload to S3 via presigned URL
            updateFileStatus(fileId, 'uploading', 30)
            const uploadResponse = await fetch(url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            })

            if (!uploadResponse.ok) {
                throw new Error('Upload to storage failed')
            }

            // 3. Register file in DB + queue processing
            updateFileStatus(fileId, 'processing', 70)
            const result = await registerFile({
                data: {
                    key,
                    filename: file.name,
                    contentType: file.type,
                    size: file.size,
                    chatId: options?.chatId,
                    taxYear: options?.taxYear,
                    batchId: options?.batchId,
                    bankName: options?.bankName,
                },
            })

            updateFileStatus(fileId, 'complete', 100)

            // Invalidate queries so the uploads page refreshes
            queryClient.invalidateQueries({ queryKey: ['user-files'] })
            queryClient.invalidateQueries({ queryKey: ['batches'] })

            toast.success(`${file.name} uploaded successfully`)
            return result
        } catch (error: any) {
            updateFileStatus(fileId, 'error', 0)
            toast.error(`Failed to upload ${file.name}: ${error.message}`)
            throw error
        }
    }

    return { uploadFile }
}

// -------------------------------------------------------------------
// Transactions
// -------------------------------------------------------------------

export const useTransactions = (params: {
    taxYear?: number
    category?: string
    direction?: 'credit' | 'debit'
    limit?: number
    offset?: number
}) => {
    return useQuery({
        queryKey: ['transactions', params],
        queryFn: () => listTransactions({ data: params }),
    })
}

export const useTransactionSummary = (taxYear: number) => {
    return useQuery({
        queryKey: ['transaction-summary', taxYear],
        queryFn: () => getTransactionSummary({ data: { taxYear } }),
        enabled: !!taxYear,
    })
}

// -------------------------------------------------------------------
// File Status Polling
// -------------------------------------------------------------------

/**
 * Polls user files every 5 seconds while any files are still processing.
 */
export const useFileStatusPolling = (taxYear?: number) => {
    const query = useUserFiles(taxYear)

    const hasProcessing = query.data?.files?.some(
        f => f.status === 'pending' || f.status === 'processing'
    )

    return useQuery({
        queryKey: ['user-files-poll', taxYear],
        queryFn: () => listUserFiles({ data: { taxYear } }),
        refetchInterval: hasProcessing ? 5000 : false,
        enabled: !!hasProcessing,
    })
}
