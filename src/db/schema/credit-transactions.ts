import { pgTable, uuid, integer, timestamp, pgEnum, jsonb, varchar, index } from 'drizzle-orm/pg-core'
import { users } from './users'

/**
 * Credit transaction types:
 * - purchase: Credits bought via Polar (positive amount)
 * - usage: Credits consumed by AI requests (negative amount)
 * - refund: Refunded purchase (negative amount)
 * - weekly_grant: Weekly free credits grant (positive amount)
 */
export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
    'purchase',
    'usage',
    'refund',
    'weekly_grant'
])

/**
 * Credit transactions ledger
 * All credit changes are recorded here for full audit trail
 * Balance = SUM(amount) WHERE user_id = X
 */
export const creditTransactions = pgTable('credit_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // User who owns this transaction
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    
    // Amount in credits (positive = credit, negative = debit)
    amount: integer('amount').notNull(),
    
    // Transaction type
    type: creditTransactionTypeEnum('type').notNull(),
    
    // Unique reference for idempotency
    // - Webhook: Polar checkout ID
    // - Usage: AI request ID (chatId-messageId or similar)
    // - Weekly reset: 'weekly-reset-YYYY-MM-DD'
    reference: varchar('reference', { length: 255 }).notNull(),
    
    // Additional metadata (Polar event data, token counts, etc.)
    metadata: jsonb('metadata'),
    
    // Timestamp
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
    // Index for fast balance calculation
    userIdIdx: index('credit_transactions_user_id_idx').on(table.userId),
    // Index for idempotency checks
    referenceIdx: index('credit_transactions_reference_idx').on(table.reference),
    // Index for time-based queries (e.g., weekly usage)
    createdAtIdx: index('credit_transactions_created_at_idx').on(table.createdAt),
    // Composite index for user + type queries
    userTypeIdx: index('credit_transactions_user_type_idx').on(table.userId, table.type),
}))

export type CreditTransaction = typeof creditTransactions.$inferSelect
export type NewCreditTransaction = typeof creditTransactions.$inferInsert
