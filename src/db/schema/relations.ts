import { relations } from 'drizzle-orm'
import { users } from './users'
import { sessions } from './sessions'
import { passwordResetTokens } from './password-reset-tokens'
import { chats } from './chats'
import { messages } from './messages'

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    passwordResetTokens: many(passwordResetTokens),
    chats: many(chats),
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

export const chatsRelations = relations(chats, ({ one, many }) => ({
    user: one(users, {
        fields: [chats.userId],
        references: [users.id],
    }),
    messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
    chat: one(chats, {
        fields: [messages.chatId],
        references: [chats.id],
    }),
}))
