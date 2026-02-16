/**
 * @deprecated This schema is deprecated and will be removed in a future version.
 * 
 * Credit purchases are now tracked in the credit_transactions ledger table instead.
 * This file is kept for migration compatibility only.
 * 
 * See: src/db/schema/credit-transactions.ts for the new ledger-based approach.
 */

import { pgTable, uuid, varchar, integer, timestamp, decimal, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

export const purchaseStatusEnum = pgEnum('purchase_status', ['pending', 'completed', 'failed', 'refunded'])

/**
 * @deprecated Use credit_transactions table instead
 */
export const creditPurchases = pgTable('credit_purchases', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    
    // Payment details
    polarPaymentId: varchar('polar_payment_id', { length: 255 }).unique(),
    polarCheckoutId: varchar('polar_checkout_id', { length: 255 }),
    
    // Amount and credits
    amountUsd: decimal('amount_usd', { precision: 10, scale: 2 }).notNull(),
    creditsPurchased: integer('credits_purchased').notNull(),
    
    // Status tracking
    status: purchaseStatusEnum('status').notNull().default('pending'),
    
    // Metadata from Polar webhook
    metadata: jsonb('metadata'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    refundedAt: timestamp('refunded_at'),
})

/** @deprecated */
export type CreditPurchase = typeof creditPurchases.$inferSelect
/** @deprecated */
export type NewCreditPurchase = typeof creditPurchases.$inferInsert
