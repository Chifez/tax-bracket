import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { chats, messages } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { createChatSchema, sendMessageSchema, getChatSchema, deleteChatSchema } from '@/server/validators/chat'
import { notFound, unauthorized } from '@/server/lib/error'

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
            throw notFound('Chat not found')
        }

        // Return with cast to fix type inference
        return {
            chat: {
                ...chat,
                messages: chat.messages.map(msg => ({
                    ...msg,
                    timestamp: msg.createdAt.toISOString(),
                    role: msg.role as any,
                    attachments: msg.attachments as any
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
            savedMessages = await db.insert(messages).values({
                chatId: newChat.id,
                role: 'user',
                content: data.message,
            }).returning()
        }

        return {
            chat: {
                ...newChat,
                messages: savedMessages.map(msg => ({
                    ...msg,
                    timestamp: msg.createdAt.toISOString(),
                    role: msg.role as any,
                    attachments: msg.attachments as any
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

        // Verify chat ownership
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
        }).returning()

        // Update chat updatedAt
        await db.update(chats)
            .set({ updatedAt: new Date() })
            .where(eq(chats.id, data.chatId))

        return {
            message: {
                ...newMessage,
                timestamp: newMessage.createdAt.toISOString(),
                role: newMessage.role as any,
                attachments: newMessage.attachments as any
            }
        }
    })

/**
 * Delete a chat
 */
export const deleteChat = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => deleteChatSchema.parse(data))
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw unauthorized()
        }

        await db.delete(chats)
            .where(and(eq(chats.id, data.chatId), eq(chats.userId, user.id)))

        return { success: true }
    })
