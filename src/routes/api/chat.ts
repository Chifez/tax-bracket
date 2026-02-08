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
                const isNewChat = !existingChatId // Track if this is a new chat

                // Helper to safely get string content from UIMessage
                const getMessageContent = (message?: UIMessage) => {
                    if (!message) return ''

                    // Check for parts array (v6 format)
                    if ('parts' in message && Array.isArray(message.parts)) {
                        return message.parts
                            .filter(part => part.type === 'text')
                            .map(part => part.text)
                            .join('')
                    }

                    // Fallback to content property (legacy format)
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

                // Generate title for new chats
                if (isNewChat && incomingMessages.length <= 1) {
                    generateChatTitle(chatId, lastContent || legacyContent, currentFileIds)
                }

                const convertedMessages = await convertToModelMessages(incomingMessages)

                const result = streamText({
                    model: openai('gpt-4o'),
                    system: systemMessage,
                    messages: convertedMessages,
                    tools: {
                        generate_structured_response: tool({
                            description: 'Generates a structured response containing an explanation, sections, charts, and stats.',
                            inputSchema: z.object({
                                explanation: z.string().describe('A very brief, plain-text introduction (max 1 sentence). Do NOT use Markdown.'),
                                sections: z.array(z.object({
                                    id: z.string().describe('Section ID'),
                                    title: z.string().describe('Section heading'),
                                    icon: z.enum(['Calculator', 'CreditCard', 'Activity', 'FileText', 'Zap', 'TrendingUp', 'DollarSign', 'PieChart']),
                                    contents: z.array(z.object({
                                        type: z.enum(['text', 'list', 'key-value', 'table']),
                                        content: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.string()), z.array(z.any())])
                                    }))
                                })).optional().describe('Collapsible detail sections'),
                                charts: z.array(z.object({
                                    id: z.string().describe('Unique chart identifier'),
                                    type: z.enum(['line', 'bar', 'area']),
                                    title: z.string().describe('Chart title'),
                                    description: z.string().describe('Brief explanation'),
                                    xKey: z.string().describe('Key for X-axis (e.g., "month")'),
                                    yKeys: z.array(z.string()).describe('Keys for Y-axis series'),
                                    colors: z.array(z.string()).describe('Hex color codes'),
                                    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).describe('Data points')
                                })).optional().describe('Data visualizations'),
                                stats: z.object({
                                    sources: z.number().optional(),
                                    words: z.number().optional(),
                                    timeSaved: z.string().optional()
                                }).optional().describe('Response metadata'),
                                sources: z.array(z.object({
                                    id: z.string(),
                                    name: z.string(),
                                    type: z.string()
                                })).optional().describe('Referenced documents')
                            })
                        })
                    },
                    onFinish: async ({ text, toolCalls }) => {
                        let sections: any[] = [];
                        let charts: any[] = [];
                        let stats: any = null;
                        let sources: any[] = [];
                        let content = text;

                        if (toolCalls) {
                            for (const call of toolCalls) {
                                if (call.toolName === 'generate_structured_response') {
                                    const args = (call as any).args || (call as any).input;
                                    content = args.explanation || text; // Use explanation as main content
                                    if (args.sections) sections = args.sections;
                                    if (args.charts) charts = args.charts;
                                    if (args.stats) stats = args.stats;
                                    if (args.sources) sources = args.sources;
                                }
                            }
                        }

                        // Fallback: If no tool called (shouldn't happen with strict prompt), use text

                        await db.insert(messages).values({
                            chatId,
                            role: 'assistant',
                            content: content,
                            sections: sections.length > 0 ? sections : null,
                            charts: charts.length > 0 ? charts : null,
                            stats: stats,
                            sources: sources.length > 0 ? sources : null,
                            createdAt: new Date(),
                        })
                    }
                })

                return result.toUIMessageStreamResponse({
                    headers: {
                        'x-chat-id': chatId,
                        'x-is-new-chat': isNewChat ? 'true' : 'false'
                    }
                })
            },
        }
    }
})