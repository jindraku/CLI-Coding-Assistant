# Final Architecture – ForgePilot

ForgePilot uses a modular architecture:

## 1. CLI Layer
Handles:
- user interaction (REPL)
- streaming responses
- tool visibility

## 2. Agent Loop (AgentRunner)
Core system component:
- sends prompts to LLM
- parses tool calls
- executes tools
- iterates until completion

## 3. Provider Layer
Supports multiple providers via abstraction:
- Ollama (local)
- OpenAI / Groq / Anthropic (cloud)

Providers implement streaming APIs for real-time output.

## 4. MCP Client (MCPManager)
- dynamically loads tools from MCP servers
- connects via stdio transport
- registers tools at runtime

## 5. MCP Servers
- Filesystem server → file operations
- External server → web/document retrieval (Context7/Tavily)
- Custom RAG server → local document retrieval

## 6. RAG System
Custom MCP server implementation:
- chunking (sliding window)
- tokenization
- TF-IDF + BM25 scoring
- Reciprocal Rank Fusion

## Execution Flow

User → CLI → AgentRunner → LLM  
→ Tool Call → MCPManager → MCP Server  
→ Result → AgentRunner → LLM  
→ Final Output
