import { pgTable, uuid, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core'

// Helper to get the start of the current week (Monday 00:00 UTC)
function getCurrentWeekStart(): Date {
    const now = new Date()
    const day = now.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day // Monday is 1, Sunday is 0
    const monday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + diff,
        0, 0, 0, 0
    ))
    return monday
}

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    googleId: varchar('google_id', { length: 255 }).unique(),
    image: varchar('image', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    // User preferences
    allowAnalytics: boolean('allow_analytics').notNull().default(true),
    allowProductUpdates: boolean('allow_product_updates').notNull().default(true),

    // Credit system configuration
    creditsLimit: integer('credits_limit').notNull().default(1000),

    // Legacy fields - kept for migration compatibility
    creditsUsed: integer('credits_used').notNull().default(0),
    weekStartDate: timestamp('week_start_date').notNull().$defaultFn(() => getCurrentWeekStart()),
    lastResetDate: timestamp('last_reset_date'),
    purchasedCredits: integer('purchased_credits').notNull().default(0),
    totalCreditsPurchased: integer('total_credits_purchased').notNull().default(0),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
