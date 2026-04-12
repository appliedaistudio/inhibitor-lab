import { describe, expect, it } from "vitest";

import {
  loadSessionSummaries,
  loadSessionSummariesSafely,
  saveSessionSummaries
} from "../src/components/chat/session-cache";
import type { SessionSummary } from "../src/types/companion";

describe("chat session cache", () => {
  it("round-trips session summaries through a map-backed store", () => {
    const storage = new Map<string, string>();
    const summaries: SessionSummary[] = [
      {
        session_id: "session-1",
        mode: "research",
        title: "PatchTST vs Informer",
        preview: "PatchTST is better supported by the retrieved evidence.",
        touched_at: "2026-04-11T16:00:00.000Z"
      },
      {
        session_id: "session-2",
        mode: "learning",
        title: "Newton's second law",
        preview: "The reasoning still has a gap around mass and acceleration.",
        touched_at: "2026-04-11T16:05:00.000Z"
      }
    ];

    saveSessionSummaries(storage, summaries);

    expect(loadSessionSummaries(storage)).toEqual(summaries);
  });

  it("falls back to an empty list when storage access throws", () => {
    expect(
      loadSessionSummariesSafely(() => {
        throw new Error("blocked");
      })
    ).toEqual([]);
  });
});
