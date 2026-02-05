import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'), // Set when logged out for token revocation
}, (table) => [
    index('sessions_token_idx').on(table.token),
    index('sessions_user_id_idx').on(table.userId),
])

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
