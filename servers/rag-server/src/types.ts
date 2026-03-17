export interface ChunkRecord {
  id: string;
  path: string;
  text: string;
  tokens: string[];
  tf: Record<string, number>;
  length: number;
  tfidfNorm: number;
}

export interface IndexData {
  version: 1;
  createdAt: string;
  root: string;
  idf: Record<string, number>;
  avgDocLen: number;
  docs: ChunkRecord[];
}
