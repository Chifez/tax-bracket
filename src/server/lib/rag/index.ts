// RAG system exports
export { knowledgeChunks, getChunksByCategory, getChunksByTags, getCoreChunks, type KnowledgeChunk, type ChunkCategory } from './knowledge-chunks'
export { generateEmbedding, generateEmbeddings, seedKnowledgeChunks, searchSimilarChunks, getChunkById } from './embeddings'
export { retrieveRelevantChunks, buildContextFromChunks, getRetrievalStats, type RetrievalResult, type RetrievedChunk } from './retriever'
export { buildDynamicPrompt, buildMinimalPrompt, getFullSystemPrompt } from './prompt-builder'
