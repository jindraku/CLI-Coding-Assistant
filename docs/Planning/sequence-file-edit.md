# Sequence Diagram – File Edit

User → CLI → AgentRunner  
AgentRunner → LLM  
LLM → tool_call: fs_read  
AgentRunner → Filesystem MCP → return file  

LLM → propose fix  
CLI → approval prompt  
User → approve  

AgentRunner → fs_write  
Filesystem updated  

LLM → final response
