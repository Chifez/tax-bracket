-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

-- Create knowledge_chunks table for RAG
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chunk_id" varchar(100) NOT NULL UNIQUE,
    "title" varchar(255) NOT NULL,
    "content" text NOT NULL,
    "category" varchar(50) NOT NULL,
    "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "priority" integer DEFAULT 5 NOT NULL,
    "embedding" vector(1536),
    "token_count" integer,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint

-- Create category index for filtering
CREATE INDEX IF NOT EXISTS "knowledge_chunks_category_idx" ON "knowledge_chunks" ("category");--> statement-breakpoint

-- Create chunk_id index for lookups
CREATE INDEX IF NOT EXISTS "knowledge_chunks_chunk_id_idx" ON "knowledge_chunks" ("chunk_id");
