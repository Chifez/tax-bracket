import { pgTable, uuid, text, timestamp, varchar, json } from 'drizzle-orm/pg-core'
import { chats } from './chats'

export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    attachments: json('attachments'), // Array of { name, type, size, url? }
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
