export interface ChunkRecord {
  id: string;
  path: string;
  text: string;
  tokens: string[];
  tf: Record<string, number>;
  length: number;
  tfidfNorm: number;
  embedding: number[];
}

export interface IndexData {
  version: 2;
  createdAt: string;
  root: string;
  idf: Record<string, number>;
  avgDocLen: number;
  embeddingModel: string;
  vectorDimensions: number;
  docs: ChunkRecord[];
}
