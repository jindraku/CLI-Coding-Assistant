# Sequence Diagram – Web Search

User → CLI → AgentRunner  
AgentRunner → LLM  
LLM → tool_call: external MCP tool (Context7/Tavily)  
AgentRunner → MCPManager → external server  
External server → return results  
AgentRunner → LLM  
CLI → display answer
