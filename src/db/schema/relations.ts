import { relations } from 'drizzle-orm'
import { users } from './users'
import { sessions } from './sessions'
import { passwordResetTokens } from './password-reset-tokens'

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    passwordResetTokens: many(passwordResetTokens),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}))

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
    user: one(users, {
        fields: [passwordResetTokens.userId],
        references: [users.id],
    }),
}))
