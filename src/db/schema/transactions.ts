import { pgTable, uuid, integer, varchar, text, timestamp, numeric, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { files } from './files'
import { uploadBatches } from './upload-batches'

export const transactionDirectionEnum = pgEnum('transaction_direction', ['credit', 'debit'])

export const transactions = pgTable('transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'set null' }),
    batchId: uuid('batch_id').references(() => uploadBatches.id, { onDelete: 'set null' }),
    taxYear: integer('tax_year').notNull(),

    // Core transaction data
    date: timestamp('date').notNull(),
    description: varchar('description', { length: 500 }).notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    direction: transactionDirectionEnum('direction').notNull(),

    // Classification
    category: varchar('category', { length: 100 }).notNull().default('uncategorized'),
    subCategory: varchar('sub_category', { length: 100 }),

    // Normalization metadata
    currency: varchar('currency', { length: 3 }).notNull().default('NGN'),
    bankName: varchar('bank_name', { length: 100 }),
    rawDescription: text('raw_description'),
    normalizedDescription: varchar('normalized_description', { length: 500 }),

    // Deduplication
    deduplicationHash: varchar('deduplication_hash', { length: 64 }).notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
    index('idx_transactions_user_year').on(table.userId, table.taxYear),
    index('idx_transactions_dedup').on(table.deduplicationHash),
    index('idx_transactions_file').on(table.fileId),
])

export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
