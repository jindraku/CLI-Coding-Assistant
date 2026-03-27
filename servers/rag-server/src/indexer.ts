import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chunkText } from "./chunker.js";
import { tokenize } from "./tokenize.js";
import { DEFAULT_VECTOR_DIMENSIONS, embedText, LOCAL_EMBEDDING_MODEL } from "./embeddings.js";
import { ChunkRecord, IndexData } from "./types.js";

const DEFAULT_EXTENSIONS = new Set([".md", ".txt", ".rst"]);

export interface IndexOptions {
  root: string;
  chunkSize: number;
  chunkOverlap: number;
  extensions?: string[];
  vectorDimensions?: number;
}

export async function buildIndex(options: IndexOptions): Promise<IndexData> {
  const files = walkFiles(options.root, options.extensions ?? Array.from(DEFAULT_EXTENSIONS));
  const chunks: ChunkRecord[] = [];
  const vectorDimensions = options.vectorDimensions ?? DEFAULT_VECTOR_DIMENSIONS;

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    const pieces = chunkText(text, {
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    });

    for (const piece of pieces) {
      const tokens = tokenize(piece);
      const tf: Record<string, number> = {};
      for (const token of tokens) {
        tf[token] = (tf[token] ?? 0) + 1;
      }
      const id = crypto.createHash("sha1").update(filePath + piece).digest("hex");
      chunks.push({
        id,
        path: filePath,
        text: piece,
        tokens,
        tf,
        length: tokens.length,
        tfidfNorm: 1,
        embedding: embedText(piece, vectorDimensions),
      });
    }
  }

  const { idf, avgDocLen } = computeIdf(chunks);
  for (const doc of chunks) {
    doc.tfidfNorm = computeTfidfNorm(doc, idf);
  }

  return {
    version: 2,
    createdAt: new Date().toISOString(),
    root: options.root,
    idf,
    avgDocLen,
    embeddingModel: LOCAL_EMBEDDING_MODEL,
    vectorDimensions,
    docs: chunks,
  };
}

function walkFiles(root: string, extensions: string[]): string[] {
  const results: string[] = [];
  const stack = [root];
  const extSet = new Set(extensions.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)));

  while (stack.length > 0) {
    const current = stack.pop()!;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(current);
      for (const entry of entries) {
        if (entry.startsWith(".")) continue;
        stack.push(path.join(current, entry));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(current);
      if (extSet.has(ext)) {
        results.push(current);
      }
    }
  }

  return results;
}

function computeIdf(docs: ChunkRecord[]): { idf: Record<string, number>; avgDocLen: number } {
  const df: Record<string, number> = {};
  let totalLen = 0;

  for (const doc of docs) {
    totalLen += doc.length;
    const seen = new Set<string>();
    for (const token of doc.tokens) {
      if (seen.has(token)) continue;
      df[token] = (df[token] ?? 0) + 1;
      seen.add(token);
    }
  }

  const idf: Record<string, number> = {};
  const docCount = docs.length || 1;
  for (const [token, count] of Object.entries(df)) {
    idf[token] = Math.log(1 + (docCount - count + 0.5) / (count + 0.5));
  }

  return { idf, avgDocLen: docs.length ? totalLen / docs.length : 1 };
}

function computeTfidfNorm(doc: ChunkRecord, idf: Record<string, number>): number {
  let sum = 0;
  for (const [token, tf] of Object.entries(doc.tf)) {
    const weight = tf * (idf[token] ?? 0);
    sum += weight * weight;
  }
  return Math.sqrt(sum) || 1;
}
