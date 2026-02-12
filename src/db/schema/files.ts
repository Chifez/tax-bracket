import { pgTable, uuid, text, timestamp, json, pgEnum, integer, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'
import { chats } from './chats'
import { uploadBatches } from './upload-batches'

export const fileStatusEnum = pgEnum('file_status', ['pending', 'processing', 'completed', 'failed'])

export const files = pgTable('files', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'set null' }),
    batchId: uuid('batch_id').references(() => uploadBatches.id, { onDelete: 'set null' }),

    url: text('url').notNull(),
    status: fileStatusEnum('status').default('pending').notNull(),
    extractedText: text('extracted_text'),

    // Tax context
    taxYear: integer('tax_year'),
    bankName: varchar('bank_name', { length: 100 }),
    statementPeriodStart: timestamp('statement_period_start'),
    statementPeriodEnd: timestamp('statement_period_end'),

    // Metadata: originalName, mimeType, size, etc.
    metadata: json('metadata').$type<{
        originalName: string
        mimeType: string
        size: number
        s3Key?: string
        [key: string]: any
    }>(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
})

export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
