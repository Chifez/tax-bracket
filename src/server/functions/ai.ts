
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { db } from '@/db'
import { chats, files } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

// Initialize OpenAI model
const model = openai('gpt-4o') // Or gpt-3.5-turbo

export async function generateChatTitle(chatId: string, messageContent?: string, fileIds?: string[]) {
    try {
        let prompt = ""

        if (messageContent) {
            prompt = `Generate a short, concise title (max 5 words) for a chat that starts with this message:\n\n"${messageContent}"`
        } else if (fileIds && fileIds.length > 0) {
            // Fetch file metadata or content
            const fileRecords = await db.query.files.findMany({
                where: inArray(files.id, fileIds),
                columns: {
                    metadata: true
                }
            })
            const fileNames = fileRecords.map(f => (f.metadata as any)?.originalName || 'File').join(', ')
            prompt = `Generate a short, concise title (max 5 words) for a chat about these files: ${fileNames}`
        } else {
            return // No context to generate title
        }

        const { text } = await generateText({
            model,
            prompt,
            // maxTokens: 20,
        })

        const title = text.trim().replace(/^"|"$/g, '')

        await db.update(chats)
            .set({ title })
            .where(eq(chats.id, chatId))

        return title
    } catch (error) {
        console.error('Failed to generate chat title:', error)
        return null
    }
}
