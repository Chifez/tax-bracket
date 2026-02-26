import { createFileRoute } from '@tanstack/react-router'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { db } from '@/db'
import { chats, messages, taxContext } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAuthenticatedUser } from '@/server/middleware/auth'
import { generateChatTitle } from '@/server/functions/ai'
import { checkCreditsMiddleware, createInsufficientCreditsResponse } from '@/server/middleware/credits'
import { deductCredits } from '@/server/lib/credits'

import { buildDynamicPrompt } from '@/server/lib/rag/prompt-builder'
import { classifyQuery } from '@/server/lib/query-classifier'
import { complexSchema, simpleSchema } from '@/server/lib/schemas'
import { responseCache } from '@/server/lib/cache/response-cache'
import { getTemplate } from '@/server/lib/templates/response-templates'
import { performanceTracker } from '@/server/lib/metrics/performance'

export const Route = createFileRoute('/api/chat')({
    server: {
        handlers: {
            POST: async ({ request }: { request: Request }) => {
                const user = await getAuthenticatedUser()
                if (!user) {
                    return new Response('Unauthorized', { status: 401 })
                }

                // Check if user has sufficient credits
                const creditCheck = await checkCreditsMiddleware(user.id)
                if (!creditCheck.allowed) {
                    return createInsufficientCreditsResponse(creditCheck.resetAt)
                }

                const { messages: incomingMessages, chatId: existingChatId, content: legacyContent, fileIds } = await request.json() as {
                    messages: UIMessage[],
                    chatId?: string,
                    content?: string,
                    fileIds?: string[]
                }

                const getMessageContent = (message?: UIMessage) => {
                    if (!message) return ''

                    if ('parts' in message && Array.isArray(message.parts)) {
                        return message.parts
                            .filter(part => part.type === 'text')
                            .map(part => part.text)
                            .join('')
                    }

                    const content = (message as any).content
                    if (typeof content === 'string') return content

                    return ''
                }

                let chatId = existingChatId
                let isNewChat = false

                if (chatId) {
                    const existingChat = await db.query.chats.findFirst({
                        where: and(eq(chats.id, chatId), eq(chats.userId, user.id))
                    })

                    if (!existingChat) {
                        isNewChat = true
                        const firstUserMsg = incomingMessages.find(m => m.role === 'user')
                        const firstContent = getMessageContent(firstUserMsg)
                        const titleContent = legacyContent || (firstContent || 'New Chat')

                        await db.insert(chats).values({
                            id: chatId,
                            userId: user.id,
                            title: titleContent.slice(0, 50),
                        })
                    }
                } else {
                    isNewChat = true
                    const firstUserMsg = incomingMessages.find(m => m.role === 'user')
                    const firstContent = getMessageContent(firstUserMsg)
                    const titleContent = legacyContent || (firstContent || 'New Chat')

                    const [newChat] = await db.insert(chats).values({
                        userId: user.id,
                        title: titleContent.slice(0, 50),
                    }).returning()
                    chatId = newChat.id
                }

                const lastMessage = incomingMessages[incomingMessages.length - 1]
                const lastContent = getMessageContent(lastMessage)
                const currentFileIds = fileIds || []

                if (lastMessage && lastMessage.role === 'user' && lastContent) {
                    // AI SDK generates nanoid-style IDs; only use them if they're valid UUIDs
                    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastMessage.id)

                    let existingMessage = null
                    if (isValidUuid) {
                        existingMessage = await db.query.messages.findFirst({
                            where: and(
                                eq(messages.chatId, chatId),
                                eq(messages.id, lastMessage.id)
                            )
                        })
                    }

                    if (!existingMessage) {
                        await db.insert(messages).values({
                            ...(isValidUuid ? { id: lastMessage.id } : {}),
                            chatId,
                            role: 'user',
                            content: lastContent,
                            fileIds: currentFileIds,
                        })
                    }
                }

                const currentYear = new Date().getFullYear()
                const contextRow = await db.select()
                    .from(taxContext)
                    .where(
                        and(
                            eq(taxContext.userId, user.id),
                            eq(taxContext.taxYear, currentYear),
                        )
                    )
                    .limit(1)

                const compactContext = contextRow.length > 0
                    ? contextRow[0].contextJson as import('@/db/schema/tax-context').CompactTaxContext
                    : null

                if (lastContent) {
                    console.log(`[Chat] Building dynamic prompt for query: "${lastContent.slice(0, 50)}..."`)
                }

                const { prompt: systemMessage, retrieval, stats } = await buildDynamicPrompt(
                    lastContent || 'Hello',
                    compactContext
                )

                if (stats.ragTokens > 0) {
                    console.log(`[RAG] Retrieved ${retrieval.chunks.length} chunks. Tokens: Core=${stats.coreTokens}, Context=${stats.contextTokens}, RAG=${stats.ragTokens}`)
                }

                if (isNewChat && incomingMessages.length <= 1) {
                    generateChatTitle(chatId, lastContent || legacyContent, currentFileIds)
                }

                // Sanitize messages before conversion — strip parts with missing 'type'
                const sanitizedMessages = incomingMessages
                    .map(msg => {
                        if ('parts' in msg && Array.isArray(msg.parts)) {
                            return {
                                ...msg,
                                parts: msg.parts.filter((part: any) => part && typeof part.type === 'string'),
                            }
                        }
                        return msg
                    })
                    .filter(msg => {
                        if ('parts' in msg && Array.isArray(msg.parts)) {
                            return msg.parts.length > 0
                        }
                        return true
                    })

                const convertedMessages = await convertToModelMessages(sanitizedMessages as UIMessage[])

                // Inject file content AFTER conversion.
                // - For text-extractable files (CSV/PDF that have been processed): inject as a text part
                // - For images: inject as a FilePart using the public URL
                // We deliberately avoid the openaiFileId here because the AI SDK's ModelMessage schema
                // requires data to be base64, Uint8Array, or a URL — not a raw OpenAI file ID string.
                if (currentFileIds.length > 0) {
                    try {
                        const attachedFiles = await db.query.files.findMany({
                            where: (f, { inArray }) => inArray(f.id, currentFileIds),
                            columns: { id: true, url: true, extractedText: true, metadata: true, status: true },
                        })

                        const extraParts: any[] = []

                        for (const f of attachedFiles) {
                            const mimeType: string = (f.metadata as any)?.mimeType ?? ''
                            const isImage = mimeType.startsWith('image/')

                            if (isImage) {
                                // Images: pass as a FilePart with a proper URL
                                extraParts.push({
                                    type: 'file' as const,
                                    data: new URL(f.url),
                                    mimeType,
                                })
                            } else if (f.extractedText) {
                                // Processed text file (CSV / PDF): inject as inline text
                                const name = (f.metadata as any)?.originalName ?? 'file'
                                extraParts.push({
                                    type: 'text' as const,
                                    text: `--- Attached file: ${name} ---\n${f.extractedText}\n--- End of file ---`,
                                })
                            } else {
                                // File is still processing — note in context so the model knows
                                const name = (f.metadata as any)?.originalName ?? 'file'
                                console.log(`[Chat] File ${f.id} (${name}) not yet processed, skipping injection`)
                                extraParts.push({
                                    type: 'text' as const,
                                    text: `[Note: the file "${name}" was just uploaded and is still being processed. It will be available in future messages.]`,
                                })
                            }
                        }

                        if (extraParts.length > 0) {
                            console.log(`[Chat] Injecting ${extraParts.length} file part(s) into last user message`)
                            const lastIdx = convertedMessages.length - 1
                            const lastConverted = convertedMessages[lastIdx]
                            if (lastConverted && lastConverted.role === 'user') {
                                const existingContent = Array.isArray(lastConverted.content)
                                    ? lastConverted.content
                                    : [{ type: 'text' as const, text: lastContent }]
                                    ; (convertedMessages[lastIdx] as any).content = [
                                        ...existingContent,
                                        ...extraParts,
                                    ]
                            }
                        }
                    } catch (err) {
                        console.error('[Chat] Failed to inject file content:', err)
                    }
                }

                const lastMessageId = lastMessage?.id || crypto.randomUUID()
                const requestId = `chat-${chatId}-msg-${lastMessageId}`

                const startTime = Date.now()

                const cacheKey = responseCache.generateKey(user.id, lastContent || '', compactContext ? 'has-context' : 'no-context')
                const cachedResponse = responseCache.get(cacheKey)

                if (cachedResponse) {
                    performanceTracker.track('latency', Date.now() - startTime, { source: 'cache' })
                    console.log(`[Chat] Cache HIT for key: ${cacheKey}`)
                }

                const classification = classifyQuery(incomingMessages, compactContext)
                console.log(`[Chat] Classification: ${classification.complexity} (${classification.intent}) - Confidence: ${classification.confidence}`)

                let forcedSystemMessage = systemMessage
                if (classification.intent === 'greeting' && classification.confidence > 0.9) {
                    console.log('[Chat] Using GREETING template via System Prompt override')
                    const template = getTemplate('GREETING')

                    forcedSystemMessage = `You are TaxBracket AI. The user has greeted you. 
                    You MUST respond by generating the following UI blocks EXACTLY as specified in this JSON.
                    Do not deviate. Do not add extra text.
                    
                    Required Blocks:
                    ${JSON.stringify((template as any).sections)}
                    
                    Use the 'generate_ui_blocks' tool to output this.`
                }

                const model = openai('gpt-4o')

                const tools = {
                    generate_ui_blocks: classification.complexity === 'simple'
                        ? simpleSchema
                        : complexSchema
                }

                const result = streamText({
                    model,
                    system: forcedSystemMessage,
                    messages: convertedMessages,
                    tools,
                    toolChoice: 'required',
                    onError: (error) => {
                        console.error('Generative UI Error:', error)
                    },
                    onFinish: async ({ text, toolCalls, usage }) => {
                        const duration = Date.now() - startTime
                        performanceTracker.track('latency', duration, { complexity: classification.complexity })

                        if (usage) {
                            const totalTokens = usage.totalTokens || ((usage.inputTokens || 0) + (usage.outputTokens || 0))
                            performanceTracker.track('token_usage', totalTokens)

                            if (totalTokens > 0) {
                                try {
                                    const deductResult = await deductCredits(user.id, totalTokens, requestId)
                                    if (deductResult.success) {
                                        console.log(`Credits deducted: ${deductResult.creditsDeducted} credits (${totalTokens} tokens) for user ${user.id}. Remaining: ${deductResult.remaining}`)
                                    }
                                } catch (error) {
                                    console.error('Failed to deduct credits:', error)
                                }
                            }
                        }

                        const blockTool = toolCalls?.find(t => t.toolName === 'generate_ui_blocks')
                        const toolArgs = (blockTool as any)?.args || (blockTool as any)?.input


                        const blocks = toolArgs?.blocks || []
                        const sources = toolArgs?.sources || []

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
                            content: text || '',
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
                        'x-is-new-chat': isNewChat ? 'true' : 'false',
                        ...creditCheck.headers,
                    }
                })
            },
        }
    }
})