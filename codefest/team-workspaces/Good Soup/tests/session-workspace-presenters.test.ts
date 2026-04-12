import { describe, expect, it } from "vitest";

import {
  buildSessionResourceLedger,
  groupSessionsForDisplay,
  toChatThreadMessages
} from "../src/components/chat/session-workspace-presenters";
import type {
  CompanionPipelineResult,
  SessionMessageRecord,
  SessionWorkspaceEntry
} from "../src/types/companion";

describe("session workspace presenters", () => {
  it("groups active and archived sessions by folder label", () => {
    const sessions: SessionWorkspaceEntry[] = [
      {
        session_id: "session-1",
        mode: "research",
        title: "Novelty check",
        preview: "Avoid strong novelty claims yet.",
        touched_at: "2026-04-11T21:05:00.000Z",
        created_at: "2026-04-11T21:00:00.000Z",
        folder: "Research ideas",
        archived_at: null
      },
      {
        session_id: "session-2",
        mode: "learning",
        title: "Newton's law",
        preview: "Check the missing force to acceleration step.",
        touched_at: "2026-04-11T21:04:00.000Z",
        created_at: "2026-04-11T20:58:00.000Z",
        folder: null,
        archived_at: null
      },
      {
        session_id: "session-3",
        mode: "research",
        title: "Archived draft",
        preview: "Old literature review thread.",
        touched_at: "2026-04-11T20:40:00.000Z",
        created_at: "2026-04-11T20:10:00.000Z",
        folder: "Research ideas",
        archived_at: "2026-04-11T20:45:00.000Z"
      }
    ];

    const grouped = groupSessionsForDisplay(sessions);

    expect(grouped.active[0]).toMatchObject({
      label: "Research ideas"
    });
    expect(grouped.active[1]).toMatchObject({
      label: "Ungrouped"
    });
    expect(grouped.archived[0]?.sessions[0]?.session_id).toBe("session-3");
  });

  it("rehydrates session message records into chat-thread messages", () => {
    const records: SessionMessageRecord[] = [
      {
        id: "u-1",
        role: "user",
        content: "Can I call this novel already?",
        timestamp: "2026-04-11T21:00:00.000Z"
      },
      {
        id: "a-1",
        role: "assistant",
        content: "I would avoid strong novelty claims yet.",
        timestamp: "2026-04-11T21:00:10.000Z"
      }
    ];

    const messages = toChatThreadMessages(records);
    expect(messages[0]?.timestamp).toBeInstanceOf(Date);
    expect(messages[1]?.role).toBe("assistant");
  });

  it("builds a session-scoped public resource ledger ordered by current cited, current further reading, then older items", () => {
    const olderResult = {
      request_id: "req-old",
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
          authors: ["Ada Lovelace"],
          published_year: 2021,
          venue: "Journal A",
          score: 0.4
        }
      ],
      draft: null,
      runtime: { backend: "mock", agent: "primary", session_id: "session-1", degraded: false },
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
            authors: ["Ada Lovelace"]
          }
        ],
        uncertainty_notes: []
      },
      audit_trail: [],
      process_events: []
    } satisfies CompanionPipelineResult;

    const middleResult = {
      ...olderResult,
      request_id: "req-mid",
      evidence: [
        {
          id: "OA-4",
          title: "Middle session paper",
          source_type: "openalex",
          snippet: "Intermediate support.",
          url: "https://openalex.org/W4",
          canonical_url: "https://openalex.org/W4",
          score: 0.51
        },
        {
          id: "OA-1-REPR",
          title: "Older OpenAlex paper (updated metadata)",
          source_type: "openalex",
          snippet: "A richer duplicate of the older paper.",
          url: "https://openalex.org/W1",
          canonical_url: "https://openalex.org/W1",
          authors: ["Ada Lovelace"],
          published_year: 2022,
          venue: "Journal A",
          score: 0.66
        }
      ],
      synthesis: {
        final_answer: "Middle answer.",
        citations: ["[OA-1-REPR] Older OpenAlex paper (updated metadata)"],
        citation_records: [
          {
            evidence_id: "OA-1-REPR",
            label: "[OA-1-REPR] Older OpenAlex paper (updated metadata)",
            title: "Older OpenAlex paper (updated metadata)",
            url: "https://openalex.org/W1"
          }
        ],
        public_resources: [
          {
            evidence_id: "OA-4",
            title: "Middle session paper",
            url: "https://openalex.org/W4",
            label: "[OA-4] Middle session paper",
            kind: "further_reading",
            snippet: "Intermediate support."
          },
          {
            evidence_id: "OA-1-REPR",
            title: "Older OpenAlex paper",
            url: "https://openalex.org/W1",
            label: "[OA-1-REPR] Older OpenAlex paper",
            kind: "citation",
            snippet: "A richer duplicate of the older paper.",
            authors: ["Ada Lovelace"],
            published_year: 2022,
            venue: "Journal A"
          }
        ],
        uncertainty_notes: []
      }
    } satisfies CompanionPipelineResult;

    const currentResult = {
      ...olderResult,
      request_id: "req-new",
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
          score: 0.91
        },
        {
          id: "LOCAL-1",
          title: "Internal memo",
          source_type: "local_corpus",
          snippet: "Supporting internal note.",
          url: "https://example.test/local-1",
          canonical_url: "https://example.test/local-1",
          score: 0.77
        },
        {
          id: "OA-FTP",
          title: "FTP source",
          source_type: "openalex",
          snippet: "Should never be rendered in the public rail.",
          url: "ftp://openalex.org/private",
          score: 0.3
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
            title: "Current further reading",
            url: "https://openalex.org/W3",
            label: "[OA-3] Current further reading",
            kind: "further_reading",
            snippet: "Recommended follow-up resource."
          },
          {
            evidence_id: "OA-FTP",
            title: "FTP source",
            url: "ftp://openalex.org/private",
            label: "[OA-FTP] FTP source",
            kind: "further_reading",
            snippet: "Should never be rendered in the public rail."
          }
        ],
        uncertainty_notes: []
      }
    } satisfies CompanionPipelineResult;

    const records: SessionMessageRecord[] = [
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
        content: "Middle answer.",
        result: middleResult,
        timestamp: "2026-04-12T00:03:00.000Z"
      },
      {
        id: "a-3",
        role: "assistant",
        content: "Current answer.",
        result: currentResult,
        timestamp: "2026-04-12T00:05:00.000Z"
      }
    ];

    const ledger = buildSessionResourceLedger(records);

    expect(ledger.items.map((item) => item.canonicalUrl)).toEqual([
      "https://openalex.org/W2",
      "https://openalex.org/W3",
      "https://openalex.org/W1",
      "https://openalex.org/W4"
    ]);
    expect(ledger.items).toHaveLength(4);
    expect(ledger.citationCount).toBe(1);
    expect(ledger.items[0]).toMatchObject({
      id: "OA-2",
      cited: true,
      current: true,
      canonicalUrl: "https://openalex.org/W2"
    });
    expect(ledger.items[2]).toMatchObject({
      id: "OA-1-REPR",
      title: "Older OpenAlex paper",
      current: false,
      authors: ["Ada Lovelace"],
      publishedYear: 2022,
      venue: "Journal A"
    });
    expect(ledger.items.some((item) => item.id === "LOCAL-1")).toBe(false);
    expect(ledger.items.some((item) => item.id === "OA-FTP")).toBe(false);
  });

  it("dedupes duplicate current-turn public URLs by preferring citations and earliest visible order", () => {
    const result = {
      request_id: "req-current",
      session_id: "session-1",
      mode: "research",
      inhibitor: { blocked: false, reasons: [], raw: {} },
      evidence: [
        {
          id: "OA-C",
          title: "Primary citation",
          source_type: "openalex",
          snippet: "Primary cited support.",
          url: "https://openalex.org/WC",
          canonical_url: "https://openalex.org/WC",
          score: 0.95
        },
        {
          id: "OA-A",
          title: "Mixed-kind duplicate",
          source_type: "openalex",
          snippet: "Same URL surfaced in multiple ways.",
          url: "https://openalex.org/WA",
          canonical_url: "https://openalex.org/WA",
          score: 0.82
        }
      ],
      draft: null,
      runtime: { backend: "mock", agent: "primary", session_id: "session-1", degraded: false },
      judgments: [],
      decision: { decision: "allow", blocking_reasons: [], revision_notes: [], verifier_summary: [] },
      synthesis: {
        final_answer: "Current answer.",
        citations: ["[OA-C] Primary citation", "[OA-A] Mixed-kind duplicate"],
        citation_records: [
          {
            evidence_id: "OA-C",
            label: "[OA-C] Primary citation",
            title: "Primary citation",
            url: "https://openalex.org/WC"
          },
          {
            evidence_id: "OA-A",
            label: "[OA-A] Mixed-kind duplicate",
            title: "Mixed-kind duplicate",
            url: "https://openalex.org/WA"
          }
        ],
        public_resources: [
          {
            evidence_id: "OA-C",
            title: "Primary citation",
            url: "https://openalex.org/WC",
            label: "[OA-C] Primary citation",
            kind: "citation",
            snippet: "Primary cited support."
          },
          {
            evidence_id: "OA-A",
            title: "Mixed-kind duplicate",
            url: "https://openalex.org/WA",
            label: "[OA-A] Mixed-kind duplicate",
            kind: "further_reading",
            snippet: "First seen as further reading."
          },
          {
            evidence_id: "OA-DUP",
            title: "Mixed-kind duplicate",
            url: "https://openalex.org/WA",
            label: "[OA-DUP] Mixed-kind duplicate",
            kind: "citation",
            snippet: "Same URL later cited.",
            authors: ["Ada Lovelace"]
          },
          {
            evidence_id: "OA-DUP-2",
            title: "Mixed-kind duplicate",
            url: "https://openalex.org/WA",
            label: "[OA-DUP-2] Mixed-kind duplicate",
            kind: "citation",
            snippet: "Duplicate citation record for the same URL."
          }
        ],
        uncertainty_notes: []
      },
      audit_trail: [],
      process_events: []
    } satisfies CompanionPipelineResult;

    const ledger = buildSessionResourceLedger([
      {
        id: "a-1",
        role: "assistant",
        content: "Current answer.",
        result,
        timestamp: "2026-04-12T00:05:00.000Z"
      }
    ]);

    expect(ledger.items.map((item) => item.canonicalUrl)).toEqual([
      "https://openalex.org/WC",
      "https://openalex.org/WA"
    ]);
    expect(ledger.items[1]).toMatchObject({
      id: "OA-DUP",
      kind: "citation",
      cited: true,
      current: true,
      currentOrder: 1,
      authors: ["Ada Lovelace"]
    });
    expect(ledger.citationCount).toBe(2);
    expect(ledger.citationCount).toBe(ledger.items.filter((item) => item.cited).length);
  });

  it("uses the current turn role for mixed-kind duplicates across turns", () => {
    const olderResult = {
      request_id: "req-old-role",
      session_id: "session-1",
      mode: "research",
      inhibitor: { blocked: false, reasons: [], raw: {} },
      evidence: [
        {
          id: "OA-OLD",
          title: "Shared URL",
          source_type: "openalex",
          snippet: "Older cited support.",
          url: "https://openalex.org/WX",
          canonical_url: "https://openalex.org/WX",
          score: 0.74
        }
      ],
      draft: null,
      runtime: { backend: "mock", agent: "primary", session_id: "session-1", degraded: false },
      judgments: [],
      decision: { decision: "allow", blocking_reasons: [], revision_notes: [], verifier_summary: [] },
      synthesis: {
        final_answer: "Older answer.",
        citations: ["[OA-OLD] Shared URL"],
        citation_records: [
          {
            evidence_id: "OA-OLD",
            label: "[OA-OLD] Shared URL",
            title: "Shared URL",
            url: "https://openalex.org/WX"
          }
        ],
        public_resources: [
          {
            evidence_id: "OA-OLD",
            title: "Shared URL",
            url: "https://openalex.org/WX",
            label: "[OA-OLD] Shared URL",
            kind: "citation",
            snippet: "Older cited support."
          }
        ],
        uncertainty_notes: []
      },
      audit_trail: [],
      process_events: []
    } satisfies CompanionPipelineResult;

    const currentResult = {
      ...olderResult,
      request_id: "req-current-role",
      evidence: [
        {
          id: "OA-CURRENT",
          title: "Shared URL",
          source_type: "openalex",
          snippet: "Current follow-up reading.",
          url: "https://openalex.org/WX",
          canonical_url: "https://openalex.org/WX",
          score: 0.51
        },
        {
          id: "OA-NEW",
          title: "Current citation",
          source_type: "openalex",
          snippet: "Current cited source.",
          url: "https://openalex.org/WY",
          canonical_url: "https://openalex.org/WY",
          score: 0.91
        }
      ],
      synthesis: {
        final_answer: "Current answer.",
        citations: ["[OA-NEW] Current citation"],
        citation_records: [
          {
            evidence_id: "OA-NEW",
            label: "[OA-NEW] Current citation",
            title: "Current citation",
            url: "https://openalex.org/WY"
          }
        ],
        public_resources: [
          {
            evidence_id: "OA-CURRENT",
            title: "Shared URL",
            url: "https://openalex.org/WX",
            label: "[OA-CURRENT] Shared URL",
            kind: "further_reading",
            snippet: "Current follow-up reading.",
            authors: ["Grace Hopper"]
          },
          {
            evidence_id: "OA-NEW",
            title: "Current citation",
            url: "https://openalex.org/WY",
            label: "[OA-NEW] Current citation",
            kind: "citation",
            snippet: "Current cited source."
          }
        ],
        uncertainty_notes: []
      }
    } satisfies CompanionPipelineResult;

    const ledger = buildSessionResourceLedger([
      {
        id: "a-old",
        role: "assistant",
        content: "Older answer.",
        result: olderResult,
        timestamp: "2026-04-12T00:00:00.000Z"
      },
      {
        id: "a-current",
        role: "assistant",
        content: "Current answer.",
        result: currentResult,
        timestamp: "2026-04-12T00:05:00.000Z"
      }
    ]);

    expect(ledger.items.map((item) => item.canonicalUrl)).toEqual([
      "https://openalex.org/WY",
      "https://openalex.org/WX"
    ]);
    expect(ledger.items[1]).toMatchObject({
      id: "OA-CURRENT",
      current: true,
      kind: "further_reading",
      cited: false,
      currentOrder: 0,
      authors: ["Grace Hopper"]
    });
    expect(ledger.citationCount).toBe(1);
  });
});
