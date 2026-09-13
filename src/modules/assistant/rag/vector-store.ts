export type EmbeddedChunk = {
  grammarPointId: string;
  title: string;
  text: string;
  embedding: number[];
};

/**
 * In-memory vector store cho RAG của trợ lý AI — nạp toàn bộ điểm ngữ pháp
 * đã có giải thích thật (vài trăm dòng), linear scan là đủ nhanh. Nếu sau
 * này mở rộng nguồn RAG (thêm từ vựng, bài học...) lên hàng chục nghìn đoạn
 * thì mới cần đổi sang vector DB thật (Qdrant, pgvector...).
 */
export class InMemoryVectorStore {
  private store: EmbeddedChunk[] = [];

  replaceAll(chunks: EmbeddedChunk[]): void {
    this.store = chunks;
  }

  /** Top K đoạn gần nhất theo cosine similarity với queryEmbedding. */
  search(queryEmbedding: number[], topK = 4): EmbeddedChunk[] {
    return this.store
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((r) => r.chunk);
  }

  dump(): EmbeddedChunk[] {
    return this.store;
  }

  load(chunks: EmbeddedChunk[]): void {
    this.store = chunks;
  }

  get size(): number {
    return this.store.length;
  }
}

/** Cosine similarity = (A · B) / (|A| × |B|) — so hướng vector, không phụ thuộc độ dài. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector dimension mismatch');
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
