# Reflection – ForgePilot

## Design Decisions

We used MCP to enable dynamic tool loading instead of hardcoding tools. This allows ForgePilot to scale more easily and makes the system closer to real-world agent architectures.

The agent loop is implemented in `AgentRunner`, which handles prompt generation, tool-call parsing, tool execution, and iterative reasoning until the task is complete.

Provider abstraction was implemented to support both local and cloud models. ForgePilot currently supports Ollama, OpenAI, Anthropic, and Groq through a shared provider interface.

The CLI was designed to make agent behavior visible to the user. Tool calls, results, step counters, and streaming output are all displayed directly in the terminal.

The project also includes session persistence through `.forgepilot/sessions.json`, allowing previous sessions to be resumed in the CLI.

---

## RAG Impact

ForgePilot uses a custom MCP RAG server with hybrid retrieval.

The retrieval pipeline combines:
- BM25
- TF-IDF
- local embedding-based cosine similarity
- Reciprocal Rank Fusion

This improved retrieval quality compared to keyword-only search. Combining lexical and vector-based ranking gave better recall and better ranking of relevant chunks, especially for broader or less exact queries.

---

## LLM Comparison

We compared OpenAI and Ollama on the same type of coding task.

OpenAI performed better in:
- multi-step reasoning
- tool selection accuracy
- final answer quality

Ollama remained useful as a local fallback and avoided API dependency, but it was less consistent on longer autonomous workflows.

---

## Challenges

- parsing tool calls reliably across providers
- handling streaming responses from multiple APIs
- keeping the agent loop stable
- dynamically loading MCP servers while tolerating missing external credentials
- keeping documentation aligned with the evolving implementation

---

## Improvements

- add undo/rollback for file edits
- add diff preview before file writes
- improve failure recovery for multi-step tasks
- improve long-output rendering in the CLI
- add richer session controls and workflow history

---

## Key Learnings

- agent systems require strict control flow
- tool definitions strongly influence LLM behavior
- hybrid RAG provides better retrieval quality than single-method search
- modular architecture improves maintainability and extensibility
