# Sequence Diagram – RAG Query

<img width="3497" height="3450" alt="DocQuery_Sequence" src="https://github.com/user-attachments/assets/87ecbe12-270e-45d5-8714-363e1589fc65" />


User → CLI → AgentRunner  
AgentRunner → LLM  
LLM → tool_call: rag.query  
AgentRunner → MCPManager → RAG Server  
RAG Server → return ranked chunks  
AgentRunner → LLM (context included)  
CLI → display response
