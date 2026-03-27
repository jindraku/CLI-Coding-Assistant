# ForgePilot

ForgePilot is an autonomous command-line coding assistant. It takes natural language tasks, reasons about a local codebase, calls tools to read/edit/run code, and iterates until the job is done.

## Highlights
- Agentic loop with tool calling and observation steps
- Provider abstraction with OpenAI as the default cloud provider and support for Anthropic, Groq, and Ollama
- MCP client that loads tools dynamically from servers
- Built-in tools for file operations, search, and shell commands
- Custom MCP RAG server with a persisted local vector database, local embeddings, and fusion retrieval
- Terminal REPL with streaming responses and explicit tool call logs

## Quickstart
```bash
npm install
export OPENAI_API_KEY=your_key_here
npm run dev
```

Run a single task:
```bash
npm run dev -- --once "Summarize the codebase"
```

Auto-execute tools without confirmation:
```bash
npm run dev -- --auto
```

## Configuration
Default config lives at `config/default.json`.

Important fields:
- `provider`: `ollama` | `openai` | `anthropic` | `groq`
- `model`: Default model name
- `providerModels`: Provider-specific fallback model names
- `autoExecute`: When `true`, tools run without confirmation
- `mcpServersPath`: MCP server definitions

By default, ForgePilot uses `openai` as the LLM provider. MCP is a separate layer: it supplies tools from the filesystem server, external resource servers such as Context7/Tavily, and the local RAG server.

If you switch providers, ForgePilot will use the matching entry from `providerModels` unless you pass `--model`.

Set provider API keys in `.env`:
```
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
CONTEXT7_API_KEY=
TAVILY_API_KEY=
```

## Tool Calling
ForgePilot accepts explicit tool calls embedded in assistant output:
```
<tool_call>{"name":"fs_read","args":{"path":"README.md"}}</tool_call>
```

It also tolerates OpenAI-style function payloads and normalizes them into the same tool execution loop. Tool calls are logged in the terminal, and their outputs are appended back into the agent context.

## MCP Servers
MCP servers are defined in `config/mcp.servers.json`. Example:
```json
{
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"],
      "env": {}
    },
    {
      "name": "context7",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "SET_ME"
      },
      "enabled": true,
      "requiredEnv": ["CONTEXT7_API_KEY"]
    },
    {
      "name": "rag",
      "command": "npx",
      "args": ["-y", "tsx", "servers/rag-server/src/index.ts"],
      "env": {}
    }
  ]
}
```

ForgePilot skips MCP servers whose required environment variables are missing, and it continues loading the remaining servers if one of them fails.

The expected MCP stack is:
- `filesystem`: local file access
- `context7` or `tavily`: external resource retrieval
- `rag`: local advanced-RAG documentation server

## Custom RAG MCP Server
The RAG server lives in `servers/rag-server`. It builds a persisted local vector database on disk, stores local embeddings for each chunk, and combines vector similarity with BM25 and TF-IDF using Reciprocal Rank Fusion.

Run it in dev mode:
```bash
npm run rag:dev
```

If you want to run the compiled JS server, build first:
```bash
npm run build
node dist/servers/rag-server/src/index.js
```

Tools:
- `rag.index`: Index a folder into `.rag/index.json`
- `rag.query`: Query the index with embedding retrieval plus fusion ranking
- `rag.stats`: View index stats, embedding model, and vector dimensions

Example tool call:
```
<tool_call>{"name":"rag.index","args":{"root":"/path/to/docs"}}</tool_call>
```

Additional `rag.index` options:
- `dbPath`: Override the output path for the vector database
- `chunkSize`: Chunk size in characters
- `chunkOverlap`: Overlap in characters
- `vectorDimensions`: Embedding vector size
- `extensions`: File extensions to include

## Architecture Overview
- `src/core/agent.ts`: Agent loop and tool execution flow
- `src/mcp/client.ts`: MCP client + dynamic tool loading
- `src/providers/*`: Provider implementations
- `src/tools/*`: Built-in tools and registry
- `servers/rag-server`: Custom MCP server for advanced RAG

## Notes
- OpenAI is the default provider, so `OPENAI_API_KEY` must be set unless you override `provider`.
- Ollama must be running locally at `http://localhost:11434` only when you switch to the `ollama` provider.
- The RAG server indexes `.md`, `.txt`, and `.rst` by default unless you override `extensions`.
- If one cloud provider account is blocked by billing or quota, switch providers with `--provider <name>` or use Ollama locally.
- The agent stops after `maxSteps` to prevent runaway loops.
