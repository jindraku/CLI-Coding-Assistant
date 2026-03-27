import { IndexData, ChunkRecord } from "./types.js";
import { cosineSimilarity, embedText } from "./embeddings.js";
import { tokenize } from "./tokenize.js";

export interface RetrievalResult {
  chunk: ChunkRecord;
  score: number;
}

interface ScoreEntry {
  doc: ChunkRecord;
  score: number;
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;
const RRF_K = 60;

export function queryIndex(index: IndexData, query: string, topK: number): RetrievalResult[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const bm25Scores = scoreBM25(index, qTokens);
  const tfidfScores = scoreTfIdf(index, qTokens);
  const vectorScores = scoreVectors(index, query);

  const bm25Rank = rankScores(bm25Scores);
  const tfidfRank = rankScores(tfidfScores);
  const vectorRank = rankScores(vectorScores);

  const fused = new Map<string, RetrievalResult>();

  for (const [id, rank] of bm25Rank) {
    const entry = bm25Scores.get(id)!;
    const score = 1 / (RRF_K + rank);
    fused.set(id, { chunk: entry.doc, score });
  }

  for (const [id, rank] of tfidfRank) {
    const entry = tfidfScores.get(id)!;
    const score = 1 / (RRF_K + rank);
    const existing = fused.get(id);
    if (existing) {
      existing.score += score;
    } else {
      fused.set(id, { chunk: entry.doc, score });
    }
  }

  for (const [id, rank] of vectorRank) {
    const entry = vectorScores.get(id)!;
    const score = 1 / (RRF_K + rank);
    const existing = fused.get(id);
    if (existing) {
      existing.score += score;
    } else {
      fused.set(id, { chunk: entry.doc, score });
    }
  }

  return Array.from(fused.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function scoreVectors(index: IndexData, query: string): Map<string, ScoreEntry> {
  const queryEmbedding = embedText(query, index.vectorDimensions);
  const scores = new Map<string, ScoreEntry>();

  for (const doc of index.docs) {
    const score = cosineSimilarity(queryEmbedding, doc.embedding);
    if (score > 0) {
      scores.set(doc.id, { doc, score });
    }
  }

  return scores;
}

function scoreBM25(index: IndexData, qTokens: string[]): Map<string, ScoreEntry> {
  const scores = new Map<string, ScoreEntry>();

  for (const doc of index.docs) {
    let score = 0;
    for (const token of qTokens) {
      const tf = doc.tf[token] ?? 0;
      if (tf === 0) continue;
      const idf = index.idf[token] ?? 0;
      const numerator = tf * (BM25_K1 + 1);
      const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / index.avgDocLen));
      score += idf * (numerator / denominator);
    }
    if (score > 0) {
      scores.set(doc.id, { doc, score });
    }
  }

  return scores;
}

function scoreTfIdf(index: IndexData, qTokens: string[]): Map<string, ScoreEntry> {
  const qtf: Record<string, number> = {};
  for (const token of qTokens) {
    qtf[token] = (qtf[token] ?? 0) + 1;
  }

  const qVec: Record<string, number> = {};
  let qNorm = 0;
  for (const [token, tf] of Object.entries(qtf)) {
    const idf = index.idf[token] ?? 0;
    const weight = tf * idf;
    qVec[token] = weight;
    qNorm += weight * weight;
  }
  qNorm = Math.sqrt(qNorm) || 1;

  const scores = new Map<string, ScoreEntry>();

  for (const doc of index.docs) {
    let dot = 0;
    for (const [token, qWeight] of Object.entries(qVec)) {
      const dTf = doc.tf[token] ?? 0;
      if (dTf === 0) continue;
      const dWeight = dTf * (index.idf[token] ?? 0);
      dot += qWeight * dWeight;
    }
    const score = dot / (qNorm * (doc.tfidfNorm || 1));
    if (score > 0) {
      scores.set(doc.id, { doc, score });
    }
  }

  return scores;
}

function rankScores(scores: Map<string, ScoreEntry>): Map<string, number> {
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([id]) => id);

  const ranked = new Map<string, number>();
  let rank = 1;
  for (const id of sorted) {
    ranked.set(id, rank++);
  }
  return ranked;
}
