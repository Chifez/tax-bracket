import { pgTable, uuid, integer, timestamp, json, index } from 'drizzle-orm/pg-core'
import { users } from './users'

/**
 * Compact AI context — the ONLY financial data sent to the LLM.
 * Target: ~200 tokens.
 */
export interface CompactTaxContext {
    taxYear: number
    incomeSources: { type: string; total: number }[]
    totalIncome: number
    taxableIncome: number
    estimatedTax: number
    effectiveRate: string
    employmentType: string
    bankCharges: number
    flags: string[]
    uploadStatus: string
    dataMonths: string
}

export const taxContext = pgTable('tax_context', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    taxYear: integer('tax_year').notNull(),
    version: integer('version').notNull().default(1),

    contextJson: json('context_json').$type<CompactTaxContext>().notNull(),
    tokenEstimate: integer('token_estimate').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_context_user_year').on(table.userId, table.taxYear),
])

export type TaxContextRow = typeof taxContext.$inferSelect
export type NewTaxContext = typeof taxContext.$inferInsert
