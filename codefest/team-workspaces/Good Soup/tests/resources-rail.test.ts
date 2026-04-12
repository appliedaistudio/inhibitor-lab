import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CitationStrip } from "../src/components/chat/citation-strip";
import { ResourcesRail } from "../src/components/chat/resources-rail";
import type { CompanionPipelineResult, SessionMessageRecord } from "../src/types/companion";

const olderResult = {
  request_id: "req-1",
  session_id: "session-1",
  mode: "research",
  inhibitor: { blocked: false, reasons: [], raw: {} },
  evidence: [
    {
      id: "OA-1",
      title: "Older OpenAlex paper",
      source_type: "openalex",
      snippet: "Older external support.",
      url: "https://openalex.org/W1",
      canonical_url: "https://openalex.org/W1",
      published_year: 2021,
      venue: "Journal A",
      score: 0.91
    }
  ],
  draft: null,
  runtime: { backend: "opencode", agent: "research", session_id: "session-1", degraded: false },
  judgments: [],
  decision: { decision: "allow", blocking_reasons: [], revision_notes: [], verifier_summary: [] },
  synthesis: {
    final_answer: "Older answer.",
    citations: ["[OA-1] Older OpenAlex paper"],
    citation_records: [
      {
        evidence_id: "OA-1",
        label: "[OA-1] Older OpenAlex paper",
        title: "Older OpenAlex paper",
        url: "https://openalex.org/W1"
      }
    ],
    public_resources: [
      {
        evidence_id: "OA-1",
        title: "Older OpenAlex paper",
        url: "https://openalex.org/W1",
        label: "[OA-1] Older OpenAlex paper",
        kind: "citation",
        snippet: "Older external support.",
        published_year: 2021,
        venue: "Journal A"
      }
    ],
    uncertainty_notes: []
  },
  audit_trail: [],
  process_events: []
} satisfies CompanionPipelineResult;

const currentResult = {
  ...olderResult,
  request_id: "req-2",
  evidence: [
    {
      id: "OA-2",
      title: "Current cited paper",
      source_type: "openalex",
      snippet: "Current cited support.",
      url: "https://openalex.org/W2",
      canonical_url: "https://openalex.org/W2",
      authors: ["Grace Hopper"],
      published_year: 2024,
      venue: "Conference B",
      score: 0.95
    },
    {
      id: "LOCAL-2",
      title: "Internal comparison note",
      source_type: "local_corpus",
      snippet: "A local note comparing PatchTST with Informer.",
      url: "https://example.test/local-2",
      canonical_url: "https://example.test/local-2",
      score: 0.51
    }
  ],
  synthesis: {
    final_answer: "Current answer.",
    citations: ["[OA-2] Current cited paper"],
    citation_records: [
      {
        evidence_id: "OA-2",
        label: "[OA-2] Current cited paper",
        title: "Current cited paper",
        url: "https://openalex.org/W2"
      }
    ],
    public_resources: [
      {
        evidence_id: "OA-2",
        title: "Current cited paper",
        url: "https://openalex.org/W2",
        label: "[OA-2] Current cited paper",
        kind: "citation",
        snippet: "Current cited support.",
        authors: ["Grace Hopper"],
        published_year: 2024,
        venue: "Conference B"
      },
      {
        evidence_id: "OA-3",
        title: "Further reading paper",
        url: "https://openalex.org/W3",
        label: "[OA-3] Further reading paper",
        kind: "further_reading",
        snippet: "Recommended follow-up reading."
      },
      {
        evidence_id: "LOCAL-2",
        title: "Internal comparison note",
        url: "file:///tmp/internal-note",
        label: "[LOCAL-2] Internal comparison note",
        kind: "further_reading",
        snippet: "A local note comparing PatchTST with Informer."
      }
    ],
    uncertainty_notes: []
  }
} satisfies CompanionPipelineResult;

const thread: SessionMessageRecord[] = [
  {
    id: "a-1",
    role: "assistant",
    content: "Older answer.",
    result: olderResult,
    timestamp: "2026-04-12T00:00:00.000Z"
  },
  {
    id: "a-2",
    role: "assistant",
    content: "Current answer.",
    result: currentResult,
    timestamp: "2026-04-12T00:05:00.000Z"
  }
];

describe("ResourcesRail", () => {
  it("shows only public session resources with cited and further reading labels", () => {
    const html = renderToStaticMarkup(
      React.createElement(ResourcesRail, { thread, mode: "research" })
    );

    expect(html).toContain("Resources");
    expect(html.indexOf("Current cited paper")).toBeLessThan(html.indexOf("Further reading paper"));
    expect(html.indexOf("Further reading paper")).toBeLessThan(html.indexOf("Older OpenAlex paper"));
    expect(html).toContain("Older OpenAlex paper");
    expect(html).toContain("Cited");
    expect(html).toContain("Further reading");
    expect(html).toContain("Conference B");
    expect(html).toContain("Journal A");
    expect(html).toContain("href=\"https://openalex.org/W2\"");
    expect(html).toContain("href=\"https://openalex.org/W3\"");
    expect(html).not.toContain("Internal comparison note");
    expect(html).not.toMatch(/>openalex</i);
    expect(html).not.toMatch(/>local corpus</i);
    expect(html).not.toContain("Retrieved");
  });

  it("renders a docked right-edge collapsed trigger with the highlighted library icon", () => {
    const html = renderToStaticMarkup(
      React.createElement(ResourcesRail, {
        thread,
        mode: "research",
        collapsed: true,
        onToggleCollapse: () => undefined
      })
    );

    expect(html).toContain("resources-rail resources-rail--collapsed");
    expect(html).toContain("resources-rail__toggle");
    expect(html).toContain("resources-rail__toggle--collapsed");
    expect(html).toContain("resources-rail__toggle-icon");
    expect(html).toContain("resources-rail__toggle-icon--active");
    expect(html).not.toContain("Collapse");
  });
});

describe("CitationStrip", () => {
  it("renders citation chips as links to resource URLs", () => {
    const html = renderToStaticMarkup(
      React.createElement(CitationStrip, {
        citations: [
          {
            evidence_id: "OA-2",
            label: "[OA-2] Current cited paper",
            title: "Current cited paper",
            url: "https://openalex.org/W2"
          }
        ]
      })
    );

    expect(html).toContain("href=\"https://openalex.org/W2\"");
    expect(html).toContain("[OA-2] Current cited paper");
  });
});
