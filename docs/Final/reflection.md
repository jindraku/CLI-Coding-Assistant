# Reflection – ForgePilot

## Design Decisions

We used MCP to enable dynamic tool loading instead of hardcoding tools. This allows ForgePilot to scale and integrate new capabilities easily.

The agent loop is implemented in `AgentRunner`, ensuring autonomous reasoning and execution.

Provider abstraction was implemented to support both local (Ollama) and cloud models (OpenAI, Groq, Anthropic).

---

## RAG Impact

Fusion Retrieval improved retrieval accuracy compared to simple keyword search.

Combining BM25 and TF-IDF resulted in better ranking and recall.

---

## Challenges

- parsing tool calls reliably
- handling streaming responses
- maintaining agent loop stability
- integrating MCP servers dynamically

---

## Improvements

- undo/rollback system for file edits
- session persistence across runs
- diff preview before file writes
- improved CLI visualization

---

## Key Learnings

- agent systems require strict control flow
- tool definitions strongly influence LLM behavior
- RAG significantly improves context quality
- modular architecture improves scalability
