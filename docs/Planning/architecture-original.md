# Original Architecture – ForgePilot

User → CLI → AgentRunner → LLM

If tool required:
AgentRunner → MCPManager → MCP Server → Tool Result → AgentRunner → LLM

RAG Pipeline:
Documents → Chunking → Tokenization → Indexing → Storage → Query → Context → LLM
