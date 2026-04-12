import { describe, expect, it } from "vitest";

import {
  buildFailureDraft,
  normalizeDraft,
  type PrimaryAgentFailureType
} from "../src/lib/companion/primary-agent";
import type { PrimaryAgentInput } from "../src/lib/companion/contracts";

function buildInput(overrides: Partial<PrimaryAgentInput> = {}): PrimaryAgentInput {
  return {
    request_id: "req-primary-1",
    session_id: "session-primary-1",
    mode: "research",
    user_message: "Compare these ideas cautiously.",
    conversation: [
      {
        role: "user",
        content: "Compare these ideas cautiously."
      }
    ],
    evidence: [],
    ...overrides
  };
}

function expectFailureDraft(type: PrimaryAgentFailureType, snippet: string) {
  const draft = buildFailureDraft(buildInput(), type);

  expect(draft.answer).toContain(snippet);
  expect(draft.claims).toEqual([]);
  expect(draft.citations_used).toEqual([]);
  expect(draft.proposed_actions).toEqual([]);
  expect(draft.student_model).toEqual({
    understanding_level: "low",
    misconceptions: [],
    missing_steps: []
  });
  expect(draft.uncertainty_notes[0]).toContain(type);
}

describe("buildFailureDraft", () => {
  it("builds a runtime unavailable message", () => {
    expectFailureDraft("runtime_unavailable", "unavailable right now");
  });

  it("builds an invalid response message", () => {
    expectFailureDraft("invalid_response", "returned an invalid response");
  });

  it("builds a backend not configured message", () => {
    expectFailureDraft("backend_not_configured", "no primary model backend is configured");
  });
});

describe("normalizeDraft", () => {
  it("strips executable action proposals from model output", () => {
    const draft = normalizeDraft(
      {
        answer: "I can draft language you can send yourself.",
        proposed_actions: [
          {
            type: "send_email",
            target: "professor@example.edu",
            details: "Send the email",
            requires_confirmation: true
          },
          {
            type: "delete_file",
            target: "draft.md",
            details: "Delete the file",
            requires_confirmation: true
          }
        ]
      },
      buildInput({
        user_message: "Draft an email to my professor."
      })
    );

    expect(draft.proposed_actions).toEqual([]);
  });

  it("rejects the legacy canned Newton answer on unrelated prompts", () => {
    expect(() =>
      normalizeDraft(
        {
          answer:
            "That is the right missing step. Newton's second law uses a = F / m, so if force and mass scale together, the acceleration can stay the same."
        },
        buildInput({
          mode: "research",
          user_message: "Compare these literature ideas cautiously."
        })
      )
    ).toThrow(/legacy heuristic/i);
  });

  it("rejects the legacy tutoring-style Newton answer in research mode", () => {
    expect(() =>
      normalizeDraft(
        {
          answer:
            "Your reasoning is not fully correct. Work from a = F / m: if force doubles and mass doubles, the acceleration stays the same."
        },
        buildInput({
          mode: "research",
          user_message: "Compare two explanations of Newton's second law from these notes."
        })
      )
    ).toThrow(/legacy heuristic/i);
  });
});
