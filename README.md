# ForgePilot

ForgePilot is an autonomous command-line coding assistant. It takes natural language tasks, reasons about a local codebase, calls tools to read/edit/run code, and iterates until the job is done.

## Highlights
- Agentic loop with tool calling and observation steps
- Provider abstraction with local (Ollama) and cloud (OpenAI, Anthropic, Groq)
- MCP client that loads tools dynamically from servers
- Built-in tools for file operations, search, and shell commands
- Custom MCP RAG server using fusion retrieval (BM25 + TF-IDF with Reciprocal Rank Fusion)
- Terminal REPL with streaming responses and explicit tool call logs

## Quickstart
```bash
npm install
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
- `model`: Model name for the chosen provider
- `autoExecute`: When `true`, tools run without confirmation
- `mcpServersPath`: MCP server definitions

Set provider API keys in `.env`:
```
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
```

## Tool Calling
ForgePilot accepts explicit tool calls embedded in assistant output:
```
<tool_call>{"name":"fs_read","args":{"path":"README.md"}}</tool_call>
```

Tool calls are logged in the terminal, and their outputs are appended to the agent context.

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
      "args": ["-y", "@context7/mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "SET_ME"
      },
      "enabled": false
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

Enable external MCP servers by setting `enabled` to `true` and providing the required API key(s).

## Custom RAG MCP Server
The RAG server lives in `servers/rag-server`. It builds a local index and supports fusion retrieval using Reciprocal Rank Fusion.

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
- `rag.query`: Query the index
- `rag.stats`: View index stats

Example tool call:
```
<tool_call>{"name":"rag.index","args":{"root":"/path/to/docs"}}</tool_call>
```

## Architecture Overview
- `src/core/agent.ts`: Agent loop and tool execution flow
- `src/mcp/client.ts`: MCP client + dynamic tool loading
- `src/providers/*`: Provider implementations
- `src/tools/*`: Built-in tools and registry
- `servers/rag-server`: Custom MCP server for advanced RAG

## Notes
- Ollama must be running locally at `http://localhost:11434` for local models.
- The RAG server indexes `.md`, `.txt`, and `.rst` by default.
- The agent stops after `maxSteps` to prevent runaway loops.
