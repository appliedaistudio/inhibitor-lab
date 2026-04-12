import type { CitationRecord } from "@/types/companion";

export function CitationStrip({ citations }: { citations: Array<string | CitationRecord> }) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="citation-chips">
      {citations.map((citation) => (
        typeof citation === "string" ? (
          <span className="citation-chip" key={citation}>
            {citation}
          </span>
        ) : (
          <a
            className="citation-chip"
            href={citation.url}
            key={citation.evidence_id}
            rel="noreferrer"
            target="_blank"
          >
            {citation.label}
          </a>
        )
      ))}
    </div>
  );
}
