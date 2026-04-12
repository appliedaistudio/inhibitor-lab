import { describe, expect, it } from "vitest";

import { synthesizeResponse } from "../src/lib/companion/synthesis";
import type { SynthesisInput } from "../src/types/companion";

describe("synthesizeResponse", () => {
  it("projects only public external citations and further reading resources", async () => {
    const input: SynthesisInput = {
      mode: "learning",
      user_message: "Teach me the basics and give me further reading.",
      draft: {
        answer: "Start with the intuition, then read the paper.",
        claims: [],
        citations_used: ["OA-1", "LOCAL-1"],
        recommended_resource_ids: ["OA-2", "LOCAL-1"],
        student_model: { understanding_level: "partial", misconceptions: [], missing_steps: [] },
        proposed_actions: [],
        uncertainty_notes: []
      },
      evidence: [
        {
          id: "OA-1",
          title: "Cited paper",
          source_type: "openalex",
          snippet: "External citation.",
          url: "https://openalex.org/W1",
          canonical_url: "https://openalex.org/W1",
          authors: ["Ada Lovelace"],
          published_year: 2024,
          venue: "Journal A",
          score: 0.9
        },
        {
          id: "OA-2",
          title: "Further reading paper",
          source_type: "openalex",
          snippet: "External follow-up.",
          url: "https://doi.org/10.1000/example",
          canonical_url: "https://doi.org/10.1000/example",
          authors: ["Grace Hopper"],
          published_year: 2023,
          venue: "Conference B",
          score: 0.8
        },
        {
          id: "LOCAL-1",
          title: "Internal note",
          source_type: "local_corpus",
          snippet: "Should stay hidden.",
          url: "https://example.test/local",
          canonical_url: "https://example.test/local",
          score: 0.7
        }
      ],
      judgments: [],
      decision: { decision: "allow", blocking_reasons: [], revision_notes: [], verifier_summary: [] }
    };

    const result = await synthesizeResponse(input);

    expect(result.citation_records).toEqual([
      {
        evidence_id: "OA-1",
        label: "[OA-1] Cited paper",
        title: "Cited paper",
        url: "https://openalex.org/W1"
      }
    ]);
    expect(result.citations).toEqual(["[OA-1] Cited paper"]);
    expect(result.citations.some((citation) => citation.includes("LOCAL-1"))).toBe(false);
    expect(result.public_resources).toEqual([
      expect.objectContaining({ evidence_id: "OA-1", kind: "citation", url: "https://openalex.org/W1" }),
      expect.objectContaining({
        evidence_id: "OA-2",
        kind: "further_reading",
        url: "https://doi.org/10.1000/example"
      })
    ]);
    expect(result.public_resources?.some((item) => item.evidence_id === "LOCAL-1")).toBe(false);
  });
});
