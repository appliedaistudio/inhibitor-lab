import { readFile } from "node:fs/promises";
import path from "node:path";

import type { EvidenceRecord } from "../contracts";
import { keywordOverlapScore } from "../utils";

interface LocalCorpusDocument {
  id: string;
  title: string;
  snippet: string;
  body: string;
  tags: string[];
  url: string;
}

let cachedDocuments: LocalCorpusDocument[] | null = null;

async function loadCorpusDocuments(): Promise<LocalCorpusDocument[]> {
  if (cachedDocuments) {
    return cachedDocuments;
  }

  const corpusPath = path.join(process.cwd(), "data", "corpus", "local-corpus.json");
  const raw = await readFile(corpusPath, "utf8");
  const parsed = JSON.parse(raw) as LocalCorpusDocument[];
  cachedDocuments = parsed;
  return parsed;
}

export async function retrieveLocalEvidence(query: string, limit = 4): Promise<EvidenceRecord[]> {
  const documents = await loadCorpusDocuments();
  const ranked = documents
    .map((document) => {
      const score = keywordOverlapScore(
        query,
        `${document.title} ${document.snippet} ${document.body} ${document.tags.join(" ")}`
      );

      return {
        document,
        score
      };
    })
    .sort((left, right) => right.score - left.score);

  const nonZero = ranked.filter((item) => item.score > 0);
  const selected = (nonZero.length > 0 ? nonZero : ranked).slice(0, limit);

  return selected.map(({ document, score }) => ({
    id: document.id,
    title: document.title,
    source_type: "local_corpus",
    snippet: document.snippet,
    url: document.url,
    score
  }));
}
