import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index, customType } from 'drizzle-orm/pg-core'

// Custom vector type for pgvector
const vector = customType<{ data: number[]; config: { dimensions: number } }>({
    dataType(config) {
        return `vector(${config?.dimensions ?? 1536})`
    },
    toDriver(value: number[]): string {
        return JSON.stringify(value)
    },
    fromDriver(value: unknown): number[] {
        if (typeof value === 'string') {
            return JSON.parse(value)
        }
        return value as number[]
    },
})

export const knowledgeChunks = pgTable('knowledge_chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    chunkId: varchar('chunk_id', { length: 100 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    priority: integer('priority').notNull().default(5),
    
    // Vector embedding (1536 dimensions for text-embedding-3-small)
    embedding: vector('embedding', { dimensions: 1536 }),
    
    // Metadata
    tokenCount: integer('token_count'),
    version: integer('version').notNull().default(1),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    // Note: HNSW index is created manually via migration (0005_add_knowledge_chunks.sql)
    // because Drizzle doesn't support operator classes for pgvector indexes
    // The index is: CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)
    categoryIdx: index('knowledge_chunks_category_idx').on(table.category),
    chunkIdIdx: index('knowledge_chunks_chunk_id_idx').on(table.chunkId),
}))

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert
