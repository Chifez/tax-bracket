import { createFileRoute } from '@tanstack/react-router'
import { streamText, tool, convertToModelMessages, UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { db } from '@/db'
import { chats, messages, files } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { generateChatTitle } from '@/server/functions/ai'
import { z } from 'zod'
import { systemPrompt } from '@/server/data/system-prompt'

export const Route = createFileRoute('/api/chat')({
    server: {
        handlers: {
            POST: async ({ request }: { request: Request }) => {
                const user = await getAuthenticatedUser()
                if (!user) {
                    return new Response('Unauthorized', { status: 401 })
                }

                const { messages: incomingMessages, chatId: existingChatId, content: legacyContent, fileIds } = await request.json() as {
                    messages: UIMessage[],
                    chatId?: string,
                    content?: string,
                    fileIds?: string[]
                }

                let chatId = existingChatId

                // Helper to safely get string content
                const getMessageContent = (message?: UIMessage) => {
                    if (!message) return ''
                    // Safely check content type
                    const content = (message as any).content
                    if (typeof content === 'string') return content
                    return ''
                }

                // 1. Create or Get Chat
                if (!chatId) {
                    const firstUserMsg = incomingMessages.find(m => m.role === 'user')
                    const firstContent = getMessageContent(firstUserMsg)
                    const titleContent = legacyContent || (firstContent || 'New Chat')

                    const [newChat] = await db.insert(chats).values({
                        userId: user.id,
                        title: titleContent.slice(0, 50),
                    }).returning()
                    chatId = newChat.id
                } else {
                    const chat = await db.query.chats.findFirst({
                        where: and(eq(chats.id, chatId), eq(chats.userId, user.id))
                    })
                    if (!chat) return new Response('Chat not found', { status: 404 })
                }

                // 2. Save User Message
                const lastMessage = incomingMessages[incomingMessages.length - 1]
                const lastContent = getMessageContent(lastMessage)
                const currentFileIds = fileIds || []

                if (lastMessage && lastMessage.role === 'user' && lastContent) {
                    await db.insert(messages).values({
                        chatId,
                        role: 'user',
                        content: lastContent,
                        fileIds: currentFileIds,
                    })
                }

                // 3. Context & Files
                let fileContext = ""
                const hasFiles = currentFileIds.length > 0
                if (hasFiles) {
                    const fileRecords = await db.query.files.findMany({
                        where: inArray(files.id, currentFileIds),
                        columns: { extractedText: true, metadata: true }
                    })

                    fileContext = fileRecords.map((f) =>
                        `File: ${f.metadata?.originalName}\nContent:\n${f.extractedText?.slice(0, 10000)}...`
                    ).join('\n\n')
                }

                // 4. Generate AI Response
                const systemMessage = systemPrompt(fileContext)

                if (incomingMessages.length <= 1) {
                    generateChatTitle(chatId, lastContent || legacyContent, currentFileIds)
                }

                const convertedMessages = await convertToModelMessages(incomingMessages)

                const result = streamText({
                    model: openai('gpt-4o'),
                    system: systemMessage,
                    messages: convertedMessages,
                    tools: {
                        generate_financial_chart: tool({
                            description: 'Generates a financial chart to visualize trends, comparisons, or distributions.',
                            inputSchema: z.object({
                                id: z.string().describe('Unique chart identifier (e.g., "tax-trend-1")'),
                                type: z.enum(['line', 'bar', 'area']).describe('Chart type'),
                                title: z.string().describe('Chart title'),
                                description: z.string().describe('Brief explanation'),
                                xKey: z.string().describe('Key for X-axis (e.g., "month")'),
                                yKeys: z.array(z.string()).describe('Keys for Y-axis series'),
                                colors: z.array(z.string()).describe('Hex color codes'),
                                data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).describe('Data points')
                            })
                        }),
                        generate_financial_breakdown: tool({
                            description: 'Generates a detailed breakdown section for tax calculations, charges, or deep dives.',
                            inputSchema: z.object({
                                id: z.string().describe('Section ID'),
                                title: z.string().describe('Section heading'),
                                icon: z.enum(['Calculator', 'CreditCard', 'Activity', 'FileText', 'Zap', 'TrendingUp', 'DollarSign', 'PieChart']),
                                contents: z.array(z.object({
                                    type: z.enum(['text', 'list', 'key-value', 'table']),
                                    content: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.string()), z.array(z.any())])
                                }))
                            })
                        }),
                        generate_key_stats: tool({
                            description: 'Generates summary statistics about the analysis.',
                            inputSchema: z.object({
                                sources: z.number().optional(),
                                words: z.number().optional(),
                                timeSaved: z.string().optional()
                            })
                        })
                    },
                    onFinish: async ({ text, toolCalls }) => {
                        const sections: any[] = [];
                        const charts: any[] = [];
                        let stats: any = null;

                        if (toolCalls) {
                            for (const call of toolCalls) {
                                // Cast to any to safely access args or input
                                const args = (call as any).args || (call as any).input;

                                if (call.toolName === 'generate_financial_chart') {
                                    charts.push(args);
                                } else if (call.toolName === 'generate_financial_breakdown') {
                                    sections.push(args);
                                } else if (call.toolName === 'generate_key_stats') {
                                    stats = args;
                                }
                            }
                        }

                        await db.insert(messages).values({
                            chatId,
                            role: 'assistant',
                            content: text,
                            sections: sections.length > 0 ? sections : null,
                            charts: charts.length > 0 ? charts : null,
                            stats: stats,
                            createdAt: new Date(),
                        })
                    }
                })

                return result.toUIMessageStreamResponse({
                    headers: {
                        'x-chat-id': chatId
                    }
                })
            },
        }
    }
})