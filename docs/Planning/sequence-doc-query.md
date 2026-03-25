# Sequence Diagram – RAG Query

User → CLI → AgentRunner  
AgentRunner → LLM  
LLM → tool_call: rag.query  
AgentRunner → MCPManager → RAG Server  
RAG Server → return ranked chunks  
AgentRunner → LLM (context included)  
CLI → display response
