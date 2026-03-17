import fs from "node:fs";
import path from "node:path";
import { IndexData } from "./types.js";

export function saveIndex(dbPath: string, data: IndexData): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

export function loadIndex(dbPath: string): IndexData | null {
  if (!fs.existsSync(dbPath)) return null;
  const raw = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(raw) as IndexData;
}
