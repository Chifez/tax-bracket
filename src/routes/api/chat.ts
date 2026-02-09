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
                        generate_ui_blocks: tool({
                            description: 'Generates an ordered list of UI blocks (text, sections, charts, stats) for the response.',
                            inputSchema: z.object({
                                blocks: z.array(z.object({
                                    type: z.enum(['text', 'section', 'chart', 'stats']).describe('The type of UI block'),
                                    content: z.string().optional().describe('For text blocks only: Plain text content (NO Markdown)'),
                                    id: z.string().optional().describe('For section/chart blocks'),
                                    title: z.string().optional().describe('For section/chart blocks'),
                                    icon: z.string().optional().describe('For section blocks: Lucide icon name'),
                                    contents: z.array(z.any()).optional().describe('For section blocks: Array of content items'),
                                    chartType: z.enum(['line', 'bar', 'area']).optional().describe('For chart blocks'),
                                    description: z.string().optional().describe('For chart blocks'),
                                    xKey: z.string().optional().describe('For chart blocks'),
                                    yKeys: z.array(z.string()).optional().describe('For chart blocks'),
                                    colors: z.array(z.string()).optional().describe('For chart blocks'),
                                    data: z.array(z.record(z.string(), z.any())).optional().describe('For chart blocks'),
                                    sources: z.number().optional().describe('For stats blocks: Number of sources'),
                                    words: z.number().optional().describe('For stats blocks: Word count'),
                                    timeSaved: z.string().optional().describe('For stats blocks: Time saved'),
                                })),
                                sources: z.array(z.object({
                                    id: z.string(),
                                    title: z.string(),
                                    url: z.string(),
                                    type: z.enum(['pdf', 'csv', 'text'])
                                })).optional()
                            })
                        })
                    },
                    toolChoice: 'required', // Force the model to use the tool
                    onError: (error) => {
                        console.error('Generative UI Error:', error)
                    },
                    onFinish: async ({ text, toolCalls, usage, finishReason }) => {
                        console.log('AI Generation Finished:', { text, toolCallsCount: toolCalls?.length, finishReason })
                        if (toolCalls?.length) {
                            console.log('Tool Calls:', JSON.stringify(toolCalls, null, 2))
                        }

                        // Extract structured data from tool calls
                        const blockTool = toolCalls?.find(t => t.toolName === 'generate_ui_blocks')
                        const toolArgs = (blockTool as any)?.args || (blockTool as any)?.input


                        const blocks = toolArgs?.blocks || []
                        const sources = toolArgs?.sources || []

                        // Map legacy fields for backward compatibility/other consumers if needed
                        // (Optional, but good for safety)
                        const sections = blocks.filter((b: any) => b.type === 'section').map((b: any) => ({
                            id: b.id,
                            title: b.title,
                            icon: b.icon,
                            contents: b.contents
                        }))

                        const charts = blocks.filter((b: any) => b.type === 'chart').map((b: any) => ({
                            id: b.id,
                            type: b.chartType,
                            title: b.title,
                            description: b.description,
                            xKey: b.xKey,
                            yKeys: b.yKeys,
                            colors: b.colors,
                            data: b.data
                        }))

                        const statsBlock = blocks.find((b: any) => b.type === 'stats')
                        const stats = statsBlock ? {
                            sources: statsBlock.sources,
                            words: statsBlock.words,
                            timeSaved: statsBlock.timeSaved
                        } : null

                        await db.insert(messages).values({
                            chatId,
                            role: 'assistant',
                            content: text || '', // Usually empty for this tool usage
                            sections: sections.length > 0 ? sections : null,
                            charts: charts.length > 0 ? charts : null,
                            stats: (stats || null) as any,
                            sources: (sources.length > 0 ? sources : null) as any,
                            metadata: {
                                blocks: blocks,
                                sources: sources
                            } as any,
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