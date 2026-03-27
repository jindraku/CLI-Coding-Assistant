# Sequence Diagram – File Edit
<img width="2996" height="2888" alt="Editfile_Sequence" src="https://github.com/user-attachments/assets/11641662-d13a-4f2f-b6a5-fc23e573d3a0" />


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
