# Demo Script – ForgePilot

## Task 1 – RAG Query

Prompt:
Explain Fusion Retrieval in this project

Expected:
[TOOL] rag.query invoked  
RAG server returns chunks  
LLM generates explanation  

---

## Task 2 – File Edit

Prompt:
Fix bug in index.ts

Expected:
[TOOL] fs_read  
Approval prompt shown  
User approves  
[TOOL] fs_write  
File updated  

---

## Task 3 – Web Search

Prompt:
Search MCP transport types

Expected:
[TOOL] context7.search or tavily.search  
External MCP server invoked  
Results returned and summarized  

---

## Notes

- All tool calls are visibly displayed in the CLI
- Multiple MCP servers are demonstrated
- Agent operates autonomously across multiple steps
