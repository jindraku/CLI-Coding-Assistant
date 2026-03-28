# Sequence Diagram – Web Search


<img width="3375" height="2325" alt="WebSearch-Sequence" src="https://github.com/user-attachments/assets/8d4db613-dbe7-4b80-9071-541d20da24af" />

User → CLI → AgentRunner  
AgentRunner → LLM  
LLM → tool_call: external MCP tool (Context7/Tavily)  
AgentRunner → MCPManager → external server  
External server → return results  
AgentRunner → LLM  
CLI → display answer
