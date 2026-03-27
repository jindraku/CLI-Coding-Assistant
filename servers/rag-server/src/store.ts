import fs from "node:fs";
import path from "node:path";
import { IndexData } from "./types.js";
import { DEFAULT_VECTOR_DIMENSIONS, embedText, LOCAL_EMBEDDING_MODEL } from "./embeddings.js";

export function saveIndex(dbPath: string, data: IndexData): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

export function loadIndex(dbPath: string): IndexData | null {
  if (!fs.existsSync(dbPath)) return null;
  const raw = fs.readFileSync(dbPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<IndexData>;
  return migrateIndex(parsed);
}

function migrateIndex(parsed: Partial<IndexData>): IndexData {
  const vectorDimensions = parsed.vectorDimensions ?? DEFAULT_VECTOR_DIMENSIONS;

  return {
    version: 2,
    createdAt: parsed.createdAt ?? new Date().toISOString(),
    root: parsed.root ?? process.cwd(),
    idf: parsed.idf ?? {},
    avgDocLen: parsed.avgDocLen ?? 1,
    embeddingModel: parsed.embeddingModel ?? LOCAL_EMBEDDING_MODEL,
    vectorDimensions,
    docs: (parsed.docs ?? []).map((doc) => ({
      ...doc,
      embedding:
        Array.isArray(doc.embedding) && doc.embedding.length > 0
          ? doc.embedding
          : embedText(doc.text ?? "", vectorDimensions),
    })),
  };
}
