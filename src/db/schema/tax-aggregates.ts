import { pgTable, uuid, integer, timestamp, numeric, varchar, json, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const taxAggregates = pgTable('tax_aggregates', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    taxYear: integer('tax_year').notNull(),
    version: integer('version').notNull().default(1),

    // Income aggregates
    totalIncome: numeric('total_income', { precision: 15, scale: 2 }).notNull().default('0'),
    taxableIncome: numeric('taxable_income', { precision: 15, scale: 2 }).notNull().default('0'),
    totalExpenses: numeric('total_expenses', { precision: 15, scale: 2 }).notNull().default('0'),
    totalBankCharges: numeric('total_bank_charges', { precision: 15, scale: 2 }).notNull().default('0'),

    // Structured breakdowns (JSONB)
    incomeCategories: json('income_categories').$type<{
        salary: number
        business: number
        rental: number
        investment: number
        other: number
    }>(),

    monthlyBreakdown: json('monthly_breakdown').$type<Array<{
        month: string        // 'YYYY-MM'
        income: number
        expenses: number
        bankCharges: number
        netBalance: number
    }>>(),

    deductions: json('deductions').$type<{
        rentRelief: number
        pension: number
        nhf: number
        nhis: number
        lifeInsurance: number
        total: number
    }>(),

    taxLiability: json('tax_liability').$type<{
        brackets: Array<{
            range: string
            rate: number
            taxable: number
            tax: number
        }>
        totalTax: number
        effectiveRate: number
        monthlyEstimate: number
    }>(),

    // Classification
    employmentClassification: varchar('employment_classification', { length: 20 })
        .$type<'paye' | 'self-employed' | 'mixed'>()
        .default('paye'),

    // Flags / anomalies
    flags: json('flags').$type<string[]>().default([]),

    // Timestamps
    computedAt: timestamp('computed_at').notNull().defaultNow(),
    invalidatedAt: timestamp('invalidated_at'),
}, (table) => [
    index('idx_aggregates_user_year').on(table.userId, table.taxYear),
])

export type TaxAggregate = typeof taxAggregates.$inferSelect
export type NewTaxAggregate = typeof taxAggregates.$inferInsert
