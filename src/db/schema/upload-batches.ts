import { pgTable, uuid, integer, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

export const batchStatusEnum = pgEnum('batch_status', ['pending', 'processing', 'completed', 'failed'])

export const uploadBatches = pgTable('upload_batches', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    taxYear: integer('tax_year').notNull(),
    label: varchar('label', { length: 255 }).default('Bank Statements'),
    status: batchStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
})

export type UploadBatch = typeof uploadBatches.$inferSelect
export type NewUploadBatch = typeof uploadBatches.$inferInsert
