import { relations } from 'drizzle-orm'
import { users } from './users'
import { sessions } from './sessions'
import { passwordResetTokens } from './password-reset-tokens'
import { chats } from './chats'
import { messages } from './messages'
import { files } from './files'
import { uploadBatches } from './upload-batches'
import { transactions } from './transactions'
import { taxAggregates } from './tax-aggregates'
import { taxContext } from './tax-context'

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    passwordResetTokens: many(passwordResetTokens),
    chats: many(chats),
    files: many(files),
    uploadBatches: many(uploadBatches),
    transactions: many(transactions),
    taxAggregates: many(taxAggregates),
    taxContexts: many(taxContext),
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

export const filesRelations = relations(files, ({ one, many }) => ({
    user: one(users, {
        fields: [files.userId],
        references: [users.id],
    }),
    chat: one(chats, {
        fields: [files.chatId],
        references: [chats.id],
    }),
    batch: one(uploadBatches, {
        fields: [files.batchId],
        references: [uploadBatches.id],
    }),
    transactions: many(transactions),
}))

export const uploadBatchesRelations = relations(uploadBatches, ({ one, many }) => ({
    user: one(users, {
        fields: [uploadBatches.userId],
        references: [users.id],
    }),
    files: many(files),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
    file: one(files, {
        fields: [transactions.fileId],
        references: [files.id],
    }),
    batch: one(uploadBatches, {
        fields: [transactions.batchId],
        references: [uploadBatches.id],
    }),
}))

export const taxAggregatesRelations = relations(taxAggregates, ({ one }) => ({
    user: one(users, {
        fields: [taxAggregates.userId],
        references: [users.id],
    }),
}))

export const taxContextRelations = relations(taxContext, ({ one }) => ({
    user: one(users, {
        fields: [taxContext.userId],
        references: [users.id],
    }),
}))
