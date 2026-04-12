import { describe, expect, it } from "vitest";

import type { CompanionPipelineResult } from "../src/types/companion";
import {
  buildAssistantTurnView,
  buildResourcesView,
  buildProcessMessages,
  upsertSessionSummary
} from "../src/components/chat/presenters";

const baseResult = {
  request_id: "req-1",
  session_id: "session-1",
  mode: "research",
  inhibitor: { blocked: false, reasons: [], raw: {} },
  evidence: [
    {
      id: "OA-1",
      title: "PatchTST",
      source_type: "openalex",
      snippet: "Patching improves long-context forecasting.",
      url: "https://openalex.org/W1",
      score: 0.91
    }
  ],
  draft: null,
  runtime: { backend: "opencode", agent: "research", session_id: "session-1", degraded: false },
  judgments: [],
  decision: { decision: "allow", blocking_reasons: [], revision_notes: [], verifier_summary: [] },
  synthesis: {
    final_answer: "PatchTST is better supported by the retrieved evidence.",
    citations: ["OA-1"],
    uncertainty_notes: []
  },
  audit_trail: [],
  process_events: []
} satisfies CompanionPipelineResult;

describe("chat presenters", () => {
  it("builds an assistant turn with visible citations and runtime badges", () => {
    const view = buildAssistantTurnView(baseResult);
    expect(view.citations).toEqual(["OA-1"]);
    expect("runtimeLabel" in view).toBe(false);
  });

  it("builds process messages from structured process events", () => {
    const view = buildProcessMessages({
      ...baseResult,
      process_events: [
        {
          id: "event-1",
          participant: "grounding_verifier",
          stage: "verifier_output",
          title: "Grounding verifier warn",
          body: "grounding reported unsupported_claim with risk score 0.74.",
          created_at: "2026-04-11T16:00:00.000Z"
        }
      ]
    });
    expect(view[0]).toMatchObject({
      participant: "grounding_verifier",
      title: "Grounding verifier warn",
      body: "grounding reported unsupported_claim with risk score 0.74."
    });
  });

  it("upserts session summaries and keeps most recent first", () => {
    const next = upsertSessionSummary([], {
      session_id: "session-1",
      mode: "research",
      title: "PatchTST vs Informer",
      preview: "PatchTST is better supported…",
      touched_at: "2026-04-11T16:00:00.000Z"
    });
    expect(next[0]?.session_id).toBe("session-1");
  });

  it("builds a resources view with cited evidence first", () => {
    const view = buildResourcesView({
      ...baseResult,
      evidence: [
        {
          id: "LOCAL-7",
          title: "Forecasting note",
          source_type: "local_corpus",
          snippet: "An internal note about patching.",
          url: "https://example.test/local-7",
          score: 0.42
        },
        baseResult.evidence[0]
      ]
    });

    expect(view.items[0]).toMatchObject({
      id: "OA-1",
      cited: true,
      title: "PatchTST"
    });
    expect(view.items[1]).toMatchObject({
      id: "LOCAL-7",
      cited: false
    });
  });
});
