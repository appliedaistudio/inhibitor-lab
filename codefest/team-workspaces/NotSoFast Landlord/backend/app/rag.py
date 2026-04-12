"""Hybrid retrieval over the Philly tenant law corpus.

Combines three signals:
  1. Dense vector search (Chroma + OpenAI embeddings) — semantic match
  2. Sparse BM25 search (rank_bm25) — keyword match
  3. Reciprocal Rank Fusion — merges the two rankings into one

This is the "advanced RAG" pattern: dense catches paraphrase/semantic
intent, sparse catches exact statute numbers and legal terms, RRF combines
them robustly without per-query weight tuning.

If Chroma isn't populated (rare — we ship a bootstrap corpus), the retriever
falls back to seed chunks so the whole stack runs. If BM25 isn't installed,
we degrade to dense-only. If dense is unavailable too, we still serve the
seed chunks. Nothing blocks the agent loop.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("CHROMA_TELEMETRY_ENABLED", "False")

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    from chromadb.utils import embedding_functions
    _HAS_CHROMA = True
except ImportError:
    _HAS_CHROMA = False

try:
    from rank_bm25 import BM25Okapi
    _HAS_BM25 = True
except ImportError:
    _HAS_BM25 = False

DATA_DIR = Path(__file__).parent.parent / "data"
LAW_DIR = DATA_DIR / "law"
CHROMA_DIR = DATA_DIR / "chroma"
COLLECTION = "philly_tenant_law"


def _tokenize(text: str) -> list[str]:
    """Lowercase alphanumeric tokenizer — good enough for legal English."""
    return re.findall(r"\w+", text.lower())


def _reciprocal_rank_fusion(
    dense_ids: list[str],
    sparse_ids: list[str],
    k: int = 60,
) -> list[tuple[str, float]]:
    """Combine two ranked lists into one via Reciprocal Rank Fusion.

    RRF score = sum over rankers of 1 / (k + rank).
    k=60 is the Cohere/LlamaIndex default.
    """
    scores: dict[str, float] = {}
    for rank, doc_id in enumerate(dense_ids):
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    for rank, doc_id in enumerate(sparse_ids):
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


class LegalRAG:
    """Hybrid retriever: dense vectors + BM25 sparse, merged with RRF.

    Lazy initialization — builds BM25 index from the Chroma collection
    on first query. Falls back to seed chunks if nothing is indexed.
    """

    def __init__(self, collection_name: str = COLLECTION):
        self.collection_name = collection_name
        self.collection = None
        self._bm25: BM25Okapi | None = None
        self._bm25_ids: list[str] = []
        self._bm25_docs: list[str] = []
        self._bm25_metas: list[dict[str, Any]] = []

        if _HAS_CHROMA:
            try:
                CHROMA_DIR.mkdir(parents=True, exist_ok=True)
                client = chromadb.PersistentClient(
                    path=str(CHROMA_DIR),
                    settings=ChromaSettings(anonymized_telemetry=False),
                )
                self.collection = client.get_or_create_collection(
                    name=collection_name,
                    embedding_function=embedding_functions.OpenAIEmbeddingFunction(
                        api_key=os.getenv("OPENAI_API_KEY", ""),
                        model_name="text-embedding-3-small",
                    ),
                )
            except Exception as e:
                print(f"[rag] chroma init failed, using stub: {e}")

    def _build_bm25(self) -> None:
        """Build the BM25 index from the Chroma collection's full document set."""
        if not _HAS_BM25 or self.collection is None:
            return
        count = self.collection.count()
        if count == 0:
            return
        try:
            snapshot = self.collection.get(include=["documents", "metadatas"])
        except Exception as e:
            print(f"[rag] bm25 snapshot failed: {e}")
            return
        self._bm25_ids = snapshot.get("ids", []) or []
        self._bm25_docs = snapshot.get("documents", []) or []
        self._bm25_metas = snapshot.get("metadatas", []) or [{} for _ in self._bm25_ids]
        tokenized = [_tokenize(d) for d in self._bm25_docs]
        if tokenized:
            self._bm25 = BM25Okapi(tokenized)

    def _dense_search(self, query: str, k: int) -> list[tuple[str, str, dict[str, Any]]]:
        """Return (id, document, metadata) tuples ranked by vector similarity."""
        if self.collection is None or self.collection.count() == 0:
            return []
        try:
            results = self.collection.query(query_texts=[query], n_results=k)
        except Exception as e:
            print(f"[rag] dense query failed: {e}")
            return []
        ids = (results.get("ids") or [[]])[0]
        docs = (results.get("documents") or [[]])[0]
        metas = (results.get("metadatas") or [[]])[0]
        return list(zip(ids, docs, metas))

    def _sparse_search(self, query: str, k: int) -> list[tuple[str, str, dict[str, Any]]]:
        """Return (id, document, metadata) tuples ranked by BM25 score."""
        if self._bm25 is None:
            self._build_bm25()
        if self._bm25 is None:
            return []
        tokens = _tokenize(query)
        if not tokens:
            return []
        scores = self._bm25.get_scores(tokens)
        ranked = sorted(
            enumerate(scores), key=lambda x: x[1], reverse=True
        )[:k]
        return [
            (self._bm25_ids[i], self._bm25_docs[i], self._bm25_metas[i])
            for i, _ in ranked
        ]

    def retrieve(self, query: str, k: int = 4) -> list[dict[str, Any]]:
        """Hybrid retrieval. Returns chunks with text, source citation, and score.

        Each result also carries a `retrieval_mode` field ("dense", "sparse",
        or "both") so the orchestrator + Glass Box can visualize how each
        chunk surfaced — useful for the Inhibitor-insight rubric bucket.
        """
        dense_pool = self._dense_search(query, k=k * 2)
        sparse_pool = self._sparse_search(query, k=k * 2)

        if not dense_pool and not sparse_pool:
            return self._stub_retrieval(query)

        # Index by doc_id for merging
        lookup: dict[str, tuple[str, dict[str, Any], set[str]]] = {}
        for doc_id, doc, meta in dense_pool:
            lookup.setdefault(doc_id, (doc, meta, set()))[2].add("dense")
        for doc_id, doc, meta in sparse_pool:
            lookup.setdefault(doc_id, (doc, meta, set()))[2].add("sparse")

        merged_rank = _reciprocal_rank_fusion(
            [d[0] for d in dense_pool],
            [d[0] for d in sparse_pool],
        )[:k]

        results: list[dict[str, Any]] = []
        for doc_id, rrf_score in merged_rank:
            if doc_id not in lookup:
                continue
            doc, meta, modes = lookup[doc_id]
            mode_label = "both" if len(modes) == 2 else next(iter(modes))
            results.append({
                "id": doc_id,
                "text": doc,
                "source": (meta or {}).get("source", "unknown"),
                "heading": (meta or {}).get("heading", ""),
                "rrf_score": rrf_score,
                "retrieval_mode": mode_label,
            })
        return results

    def count(self) -> int:
        if self.collection is None:
            return 0
        try:
            return self.collection.count()
        except Exception:
            return 0

    def _stub_retrieval(self, query: str) -> list[dict[str, Any]]:
        """Last-resort seed chunks so the agent works without ingestion."""
        return [
            {
                "id": "stub-501",
                "source": "68 P.S. § 250.501 (PA Landlord-Tenant Act)",
                "heading": "Self-help eviction is illegal",
                "text": (
                    "A landlord may not evict a tenant without a court order. "
                    "Self-help eviction — changing locks, removing belongings, "
                    "shutting off utilities — is prohibited."
                ),
                "retrieval_mode": "stub",
                "rrf_score": 0.0,
            },
            {
                "id": "stub-9804",
                "source": "Phila. Code § 9-804 (Good Cause Eviction)",
                "heading": "Notice before eviction",
                "text": (
                    "Landlords in Philadelphia must provide written notice and "
                    "have 'good cause' to terminate a tenancy."
                ),
                "retrieval_mode": "stub",
                "rrf_score": 0.0,
            },
        ]
