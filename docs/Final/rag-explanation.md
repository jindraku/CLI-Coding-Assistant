# RAG Implementation – ForgePilot

## Overview
ForgePilot uses a custom MCP RAG server implementing hybrid retrieval with a persisted local index.

This is not a third-party hosted RAG pipeline. It is built using local indexing, local embeddings, and custom retrieval logic.

## Retrieval Technique

ForgePilot combines four retrieval signals:

1. BM25 scoring (keyword relevance)
2. TF-IDF similarity
3. local embedding-based cosine similarity
4. Reciprocal Rank Fusion (RRF)

This creates a hybrid retrieval system that balances lexical matching and semantic similarity.

## Indexing Pipeline

- Files are read from the documentation folder
- Text is chunked using a sliding-window chunker
- Tokens are generated with stopword filtering
- TF and IDF values are computed
- Local embeddings are generated for each chunk
- All data is stored in a persisted local index at `.rag/index.json`

## Retrieval Pipeline

- Query is tokenized
- BM25 scores are computed
- TF-IDF scores are computed
- Query embedding is generated locally
- Cosine similarity is computed against stored chunk embeddings
- Results are combined using Reciprocal Rank Fusion (RRF)

## Benefits

- better recall than keyword-only search
- stronger ranking quality
- improved handling of vague or partially matching queries
- persistent local retrieval that can be reused across future sessions
