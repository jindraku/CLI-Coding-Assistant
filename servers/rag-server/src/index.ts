import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { buildIndex } from "./indexer.js";
import { loadIndex, saveIndex } from "./store.js";
import { queryIndex } from "./retrieval.js";

const IndexArgs = z.object({
  root: z.string(),
  dbPath: z.string().optional(),
  chunkSize: z.number().optional(),
  chunkOverlap: z.number().optional(),
  extensions: z.array(z.string()).optional(),
  vectorDimensions: z.number().optional(),
});

const QueryArgs = z.object({
  query: z.string(),
  topK: z.number().optional(),
  dbPath: z.string().optional(),
});

const StatsArgs = z.object({
  dbPath: z.string().optional(),
});

const server = new Server(
  { name: "rag-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "rag.index",
        description: "Index a documentation folder into a persisted local vector database using embedding retrieval plus fusion ranking.",
        inputSchema: {
          type: "object",
          properties: {
            root: { type: "string" },
            dbPath: { type: "string" },
            chunkSize: { type: "number" },
            chunkOverlap: { type: "number" },
            extensions: { type: "array", items: { type: "string" } },
            vectorDimensions: { type: "number" },
          },
          required: ["root"],
        },
      },
      {
        name: "rag.query",
        description: "Query the indexed documentation using embeddings, BM25, TF-IDF, and reciprocal rank fusion.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            topK: { type: "number" },
            dbPath: { type: "string" },
          },
          required: ["query"],
        },
      },
      {
        name: "rag.stats",
        description: "Show stats about the current index.",
        inputSchema: {
          type: "object",
          properties: {
            dbPath: { type: "string" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "rag.index") {
    const parsed = IndexArgs.parse(args ?? {});
    const dbPath = parsed.dbPath ? path.resolve(parsed.dbPath) : path.resolve(".rag/index.json");
    const index = await buildIndex({
      root: path.resolve(parsed.root),
      chunkSize: parsed.chunkSize ?? 900,
      chunkOverlap: parsed.chunkOverlap ?? 120,
      extensions: parsed.extensions,
      vectorDimensions: parsed.vectorDimensions,
    });
    saveIndex(dbPath, index);
    return {
      content: [
        {
          type: "text",
          text: `Indexed ${index.docs.length} chunks from ${index.root}. Saved vector database to ${dbPath} using ${index.embeddingModel} (${index.vectorDimensions} dims).`,
        },
      ],
    };
  }

  if (name === "rag.query") {
    const parsed = QueryArgs.parse(args ?? {});
    const dbPath = parsed.dbPath ? path.resolve(parsed.dbPath) : path.resolve(".rag/index.json");
    const index = loadIndex(dbPath);
    if (!index) {
      return {
        content: [
          { type: "text", text: `No index found at ${dbPath}. Run rag.index first.` },
        ],
      };
    }
    const results = queryIndex(index, parsed.query, parsed.topK ?? 5);
    const lines = results.map((r, i) => {
      const preview = r.chunk.text.replace(/\s+/g, " ").slice(0, 240);
      return `${i + 1}. ${r.chunk.path}\n${preview}`;
    });

    return { content: [{ type: "text", text: lines.join("\n\n") }] };
  }

  if (name === "rag.stats") {
    const parsed = StatsArgs.parse(args ?? {});
    const dbPath = parsed.dbPath ? path.resolve(parsed.dbPath) : path.resolve(".rag/index.json");
    const index = loadIndex(dbPath);
    if (!index) {
      return {
        content: [
          { type: "text", text: `No index found at ${dbPath}.` },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Index root: ${index.root}\nChunks: ${index.docs.length}\nCreated: ${index.createdAt}\nEmbedding model: ${index.embeddingModel}\nVector dimensions: ${index.vectorDimensions}`,
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
