import { pgTable, uuid, text, timestamp, json, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users' // Assuming users table exists, need to verify import path
import { chats } from './chats'

export const fileStatusEnum = pgEnum('file_status', ['pending', 'processing', 'completed', 'failed'])

export const files = pgTable('files', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'set null' }),

    url: text('url').notNull(),
    status: fileStatusEnum('status').default('pending').notNull(),
    extractedText: text('extracted_text'),

    // Metadata: originalName, mimeType, size, etc.
    metadata: json('metadata').$type<{
        originalName: string
        mimeType: string
        size: number
        [key: string]: any
    }>(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
})

export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
