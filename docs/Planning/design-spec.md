# Design Specification – ForgePilot

## Problem
Developers need a system that can autonomously read, modify, and reason over codebases. Traditional chatbots can generate code but cannot execute actions or interact with real systems.

## Solution
ForgePilot is a command-line autonomous coding assistant that:
- interprets natural language tasks
- selects tools dynamically via MCP
- executes actions on the local system
- iterates until completion using an agentic loop

## Goals
- Build an autonomous agent (not a chatbot)
- Enable MCP-based tool execution
- Support multiple LLM providers
- Implement a local RAG system
- Provide safe execution (confirmation mode)

## Architecture Overview
Components:
- CLI Interface (REPL)
- Agent Loop (AgentRunner)
- Provider Layer (LLM abstraction)
- MCP Client (MCPManager)
- MCP Servers:
  - Filesystem
  - External (Context7/Tavily – configurable)
  - Custom RAG Server

## Key Design Decisions
- Agent loop implemented in `AgentRunner` for iterative reasoning
- MCP used for dynamic tool extensibility instead of hardcoding tools
- Provider abstraction supports Anthropic, OpenAI, Groq, and Ollama
- Fusion Retrieval (BM25 + TF-IDF + RRF) used for RAG

## Functional Requirements
- Accept natural language input
- Parse tool calls (`<tool_call>`)
- Execute file operations
- Perform web search via MCP
- Retrieve documentation via RAG server

## Non-Functional Requirements
- Modular architecture
- Clean and readable TypeScript code
- Persistent RAG index (`.rag/index.json`)
- Responsive CLI with streaming output
