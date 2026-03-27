# Final Architecture – ForgePilot

ForgePilot uses a modular architecture built around an autonomous agent loop.

## 1. CLI Layer
Handles:
- user interaction (REPL)
- streaming responses
- tool visibility
- session selection and resume flow

## 2. Agent Loop (AgentRunner)
Core system component:
- sends prompts to the selected LLM
- parses tool calls
- executes tools
- observes results
- iterates until completion or step limit

## 3. Provider Layer
Supports multiple providers through a shared abstraction:
- Ollama (local)
- OpenAI (default cloud provider)
- Groq
- Anthropic

Providers expose streaming responses so the CLI can display output in real time.

## 4. Tool Layer
ForgePilot includes:
- built-in tools for file read/write/list/search and shell execution
- dynamically loaded MCP tools from external servers

Tool execution supports confirmation mode and auto-execute mode.

## 5. MCP Client (MCPManager)
- dynamically loads tools from MCP servers
- connects through stdio transport
- skips servers whose required environment variables are missing
- continues loading remaining servers when one server fails

## 6. MCP Servers
- Filesystem server → local file operations
- External server → documentation or web retrieval (Context7/Tavily)
- Custom RAG server → local documentation retrieval

## 7. RAG System
Custom MCP RAG server implementation:
- chunking with overlap
- tokenization and stopword filtering
- TF-IDF scoring
- BM25 scoring
- local embeddings
- cosine similarity
- Reciprocal Rank Fusion
- persisted local index at `.rag/index.json`

## 8. Session Persistence
ForgePilot stores session history in `.forgepilot/sessions.json` so prior sessions can be resumed.

## Execution Flow

User → CLI → AgentRunner → LLM  
→ Tool Call → Tool Executor / MCPManager → MCP Server or Built-in Tool  
→ Result → AgentRunner → LLM  
→ Final Output
