"""Ingest tenant law corpus into Chroma for RAG.

Reads `backend/data/law/*.md`, chunks by `##` headings, and embeds each
chunk via OpenAI embeddings into the `philly_tenant_law` Chroma collection.

Usage:
    cd backend && source .venv/bin/activate
    python ../scripts/ingest_laws.py
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv  # noqa: E402
load_dotenv(Path(__file__).parent.parent / ".env")

os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

import chromadb  # noqa: E402
from chromadb.config import Settings as ChromaSettings  # noqa: E402
from chromadb.utils import embedding_functions  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LAW_DIR = PROJECT_ROOT / "backend" / "data" / "law"
CHROMA_DIR = PROJECT_ROOT / "backend" / "data" / "chroma"
COLLECTION = "philly_tenant_law"


def parse_markdown_sections(text: str, source_file: str) -> list[dict]:
    """Split a markdown doc by ## headings into RAG chunks.

    Each H2 section becomes one chunk. We keep the heading, the body, and
    the first 'Citation:' line (if present) as metadata.
    """
    sections = re.split(r"(?m)^## ", text)
    chunks: list[dict] = []
    for section in sections:
        section = section.strip()
        if not section:
            continue
        lines = section.splitlines()
        if not lines:
            continue
        heading = lines[0].strip()
        if heading.startswith("#"):
            # Front matter / H1; skip.
            continue
        body = "\n".join(lines[1:]).strip()
        if not body:
            continue

        citation_match = re.search(r"\*\*Citation:\*\*\s*(.+)", body)
        citation = citation_match.group(1).strip() if citation_match else heading
        chunks.append({
            "heading": heading,
            "body": body,
            "citation": citation,
            "source_file": source_file,
        })
    return chunks


def load_all_chunks() -> list[dict]:
    chunks: list[dict] = []
    for md_file in sorted(LAW_DIR.rglob("*.md")):
        rel = md_file.relative_to(PROJECT_ROOT)
        text = md_file.read_text()
        chunks.extend(parse_markdown_sections(text, str(rel)))
    return chunks


def ingest(chunks: list[dict]) -> None:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set — cannot embed.")
        sys.exit(1)

    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    try:
        client.delete_collection(name=COLLECTION)
        print(f"Dropped existing collection '{COLLECTION}'.")
    except Exception:
        pass

    embed_fn = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-3-small",
    )
    collection = client.create_collection(
        name=COLLECTION,
        embedding_function=embed_fn,
    )

    ids = [f"chunk-{i:03d}" for i in range(len(chunks))]
    documents = [
        f"## {c['heading']}\n\n{c['body']}"
        for c in chunks
    ]
    metadatas = [
        {
            "source": c["citation"],
            "heading": c["heading"],
            "source_file": c["source_file"],
        }
        for c in chunks
    ]

    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    print(f"Ingested {len(chunks)} chunks into '{COLLECTION}'.")
    print(f"Collection count: {collection.count()}")


def main():
    chunks = load_all_chunks()
    print(f"Parsed {len(chunks)} sections from {LAW_DIR.relative_to(PROJECT_ROOT)}")
    for c in chunks[:5]:
        print(f"  - {c['heading']}  →  {c['citation'][:60]}")
    ingest(chunks)


if __name__ == "__main__":
    main()
