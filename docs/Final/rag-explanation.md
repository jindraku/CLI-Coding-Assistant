# RAG Implementation – ForgePilot

## Overview
ForgePilot uses a custom MCP RAG server implementing Fusion Retrieval.

This is not a third-party library — it is built using local indexing and retrieval logic.

## Retrieval Technique

Fusion Retrieval combines:

1. BM25 scoring (keyword relevance)
2. TF-IDF similarity
3. Reciprocal Rank Fusion (RRF)

## Indexing Pipeline

- Files read from documentation folder
- Chunked using sliding window approach
- Tokenized (stopword filtering applied)
- TF and IDF values computed
- Stored in JSON vector-like database

## Retrieval Pipeline

- Query tokenized
- BM25 scores computed
- TF-IDF scores computed
- Combined using RRF

## Benefits

- higher recall than keyword-only search
- better ranking of relevant documents
- robust performance on vague queries
