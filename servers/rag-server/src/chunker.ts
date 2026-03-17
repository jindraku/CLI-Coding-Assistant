export interface ChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export function chunkText(text: string, options: ChunkerOptions): string[] {
  const size = Math.max(200, options.chunkSize);
  const overlap = Math.min(size - 50, options.chunkOverlap);
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    const slice = text.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}
