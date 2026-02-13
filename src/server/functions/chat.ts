import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { chats, messages } from '@/db/schema'
import { eq, desc, and, gt } from 'drizzle-orm'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { createChatSchema, sendMessageSchema, getChatSchema, deleteChatSchema, editMessageSchema, renameChatSchema } from '@/server/validators/chat'
import { notFound, unauthorized } from '@/server/lib/error'
import { MOCK_RESPONSES } from '@/server/data/mock-responses'
import { s3Client, BUCKET_NAME } from '@/server/lib/s3'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { files } from '@/db/schema'

/**
 * Helper to determine mock response
 */
function getMockResponse(content: string, hasAttachments: boolean) {
    const lowerContent = content.toLowerCase()

    // Greeting
    if (['hello', 'hi', 'hey', 'start'].some(w => lowerContent.includes(w)) && !hasAttachments) {
        return MOCK_RESPONSES.GREETING
    }

    // File based responses
    if (hasAttachments) {
        if (lowerContent.includes('tax')) return MOCK_RESPONSES.FILE_TAX
        if (lowerContent.includes('bank') || lowerContent.includes('fee')) return MOCK_RESPONSES.FILE_BANK
        if (lowerContent.includes('overview') || lowerContent.includes('summary')) return MOCK_RESPONSES.FILE_OVERVIEW
        if (lowerContent.includes('deduct')) return MOCK_RESPONSES.FILE_DEDUCTIONS

        // Default file response if no specific keyword
        return MOCK_RESPONSES.FILE_OVERVIEW
    }

    // No file but asking for analysis
    if (lowerContent.includes('tax') || lowerContent.includes('bank') || lowerContent.includes('analyze')) {
        return MOCK_RESPONSES.NO_FILE_TAX_BANK
    }

    return MOCK_RESPONSES.DEFAULT
}

/**
 * Get all chats for the current user
 */
export const getChats = createServerFn()
    .handler(async () => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        const userChats = await db.query.chats.findMany({
            where: eq(chats.userId, user.id),
            orderBy: [desc(chats.updatedAt)],
        })

        return { chats: userChats }
    })

/**
 * Get a single chat with messages
 */
export const getChat = createServerFn()
    .inputValidator((data: unknown) => getChatSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        const chat = await db.query.chats.findFirst({
            where: and(eq(chats.id, data.chatId), eq(chats.userId, user.id)),
            with: {
                messages: true
            }
        })

        if (!chat) {
            return { chat: null }
        }

        // Return with cast to fix type inference
        return {
            chat: {
                ...chat,
                messages: chat.messages.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    timestamp: msg.createdAt.toISOString(), // Map createdAt to timestamp
                    attachments: msg.attachments as any,
                    sections: msg.sections as any,
                    charts: msg.charts as any,
                    stats: msg.stats as any,
                    sources: msg.sources as any,
                    metadata: msg.metadata as any,
                }))
            }
        }
    })

/**
 * Create a new chat
 */
export const createChat = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => createChatSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        const [newChat] = await db.insert(chats).values({
            userId: user.id,
            title: data.message ? data.message.slice(0, 50) : 'New Chat',
        }).returning()

        let savedMessages: any[] = []
        if (data.message) {
            // User message
            const [userMsg] = await db.insert(messages).values({
                chatId: newChat.id,
                role: 'user',
                content: data.message,
                attachments: data.attachments, // Save attachments
            }).returning()
            savedMessages.push(userMsg)

            // Determine Mock Response
            const mockData = getMockResponse(data.message, (data.attachments?.length || 0) > 0)

            const [aiMsg] = await db.insert(messages).values({
                chatId: newChat.id,
                role: 'assistant',
                content: mockData.content,
                sections: mockData.sections,
                charts: 'charts' in mockData ? (mockData as any).charts : undefined,
                stats: mockData.stats
            }).returning()
            savedMessages.push(aiMsg)
        }

        return {
            chat: {
                ...newChat,
                messages: savedMessages.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    timestamp: msg.createdAt.toISOString(),
                    attachments: msg.attachments as any,
                    sections: msg.sections as any,
                    charts: msg.charts as any,
                    stats: msg.stats as any,
                    sources: msg.sources as any,
                    metadata: msg.metadata as any,
                }))
            }
        }
    })

/**
 * Send a message to a chat
 */
export const sendMessage = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => sendMessageSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        // Verify chat ownership and get current title
        const chat = await db.query.chats.findFirst({
            where: and(eq(chats.id, data.chatId), eq(chats.userId, user.id))
        })

        if (!chat) {
            throw notFound('Chat not found')
        }

        const [newMessage] = await db.insert(messages).values({
            chatId: data.chatId,
            role: data.role,
            content: data.content,
            attachments: data.attachments,
        }).returning()

        // Update chat updatedAt
        const updateData: Partial<typeof chats.$inferInsert> = {
            updatedAt: new Date()
        }

        // Update title if it's the first message or title is "New Chat"
        if (chat.title === 'New Chat') {
            updateData.title = data.content.slice(0, 50)
        }

        await db.update(chats)
            .set(updateData)
            .where(eq(chats.id, data.chatId))

        // Mock AI Response with structured data
        if (data.role === 'user') {
            const hasAttachments = (data.attachments?.length || 0) > 0
            const mockData = getMockResponse(data.content, hasAttachments)

            await db.insert(messages).values({
                chatId: data.chatId,
                role: 'assistant',
                content: mockData.content,
                sections: mockData.sections,
                charts: 'charts' in mockData ? (mockData as any).charts : undefined,
                stats: mockData.stats
            })

            return {
                message: {
                    ...newMessage,
                    timestamp: newMessage.createdAt.toISOString(),
                    role: newMessage.role as any,
                    attachments: newMessage.attachments as any,
                    sections: newMessage.sections as any,
                    charts: newMessage.charts as any,
                    stats: newMessage.stats as any,
                    sources: newMessage.sources as any,
                    metadata: newMessage.metadata as any,
                    fileIds: (newMessage.fileIds as string[]) || []
                }
            }
        }

        return {
            message: {
                id: newMessage.id,
                role: newMessage.role as 'user' | 'assistant',
                content: newMessage.content,
                timestamp: newMessage.createdAt.toISOString(),
                attachments: newMessage.attachments as any,
                sections: newMessage.sections as any,
                charts: newMessage.charts as any,
                sources: newMessage.sources as any,
                metadata: newMessage.metadata as any,
                fileIds: (newMessage.fileIds as string[]) || []
            }
        }
    })

/**
 * Delete a chat
 */
/**
 * Delete a chat and cleanup files
 */
export const deleteChat = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => deleteChatSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        // 1. Find all files associated with this chat
        const chatFiles = await db.query.files.findMany({
            where: and(eq(files.chatId, data.chatId), eq(files.userId, user.id))
        })

        // 2. Delete files from S3/R2 (fire and forget for speed)
        if (chatFiles.length > 0) {
            Promise.all(chatFiles.map(file => {
                if (file.metadata?.s3Key) {
                    return s3Client.send(new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: file.metadata.s3Key
                    })).catch(err => console.error('Failed to delete S3 object', err))
                }
                return Promise.resolve()
            })).catch(err => console.error('Error cleaning up S3 files', err))

            // 3. Delete files from DB
            await db.delete(files)
                .where(and(eq(files.chatId, data.chatId), eq(files.userId, user.id)))
        }

        // 4. Delete chat (cascades to messages)
        await db.delete(chats)
            .where(and(eq(chats.id, data.chatId), eq(chats.userId, user.id)))

        return { success: true }
    })

/**
 * Rename a chat
 */
export const renameChat = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => renameChatSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        await db.update(chats)
            .set({ title: data.title, updatedAt: new Date() })
            .where(and(eq(chats.id, data.chatId), eq(chats.userId, user.id)))

        return { success: true }
    })

/**
 * Edit a message and delete subsequent history
 */
export const editMessage = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => editMessageSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        // 1. Verify ownership and get the message to edit
        const messageToEdit = await db.query.messages.findFirst({
            where: eq(messages.id, data.messageId),
            with: {
                chat: true
            }
        })

        if (!messageToEdit) {
            throw notFound('Message not found')
        }

        if (messageToEdit.chat.userId !== user.id) {
            throw unauthorized()
        }

        // 2. Update the message content
        await db.update(messages)
            .set({ content: data.content })
            .where(eq(messages.id, data.messageId))

        // 3. Delete all subsequent messages (since we need to regenerate)
        await db.delete(messages)
            .where(and(
                eq(messages.chatId, data.chatId),
                gt(messages.createdAt, messageToEdit.createdAt)
            ))

        // 4. Return success
        return { success: true }
    })
