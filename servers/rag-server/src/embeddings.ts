import crypto from "node:crypto";
import { tokenize } from "./tokenize.js";

export const DEFAULT_VECTOR_DIMENSIONS = 256;
export const LOCAL_EMBEDDING_MODEL = "local-hash-embedding-v1";

export function embedText(text: string, dimensions = DEFAULT_VECTOR_DIMENSIONS): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const digest = crypto.createHash("sha256").update(token).digest();
    const sign = digest[0] % 2 === 0 ? 1 : -1;
    const index = digest.readUInt16BE(1) % dimensions;
    const weight = 1 + (digest[3] / 255);
    vector[index] += sign * weight;
  }

  return normalize(vector);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const size = Math.min(a.length, b.length);
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  for (let i = 0; i < size; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }

  if (aNorm === 0 || bNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return vector;
  }
  return vector.map((value) => value / norm);
}
