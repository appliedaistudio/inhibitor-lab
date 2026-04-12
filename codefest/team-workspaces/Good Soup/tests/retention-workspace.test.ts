import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RetentionWorkspace } from "../src/components/retention/retention-workspace";
import type { RetentionCard, RetentionDeck, RetentionReview } from "../src/lib/retention/types";

const decks: RetentionDeck[] = [
  { id: 7, user_id: 1, name: "Newton", created_at: "2026-04-11T18:00:00.000Z" },
  { id: 8, user_id: 1, name: "Optics", created_at: "2026-04-10T18:00:00.000Z" }
];

const cards: RetentionCard[] = [
  {
    id: 22,
    deck_id: 7,
    question: "What does F = ma describe?",
    answer: "The net force on an object equals mass times acceleration.",
    streak: 2,
    next_review: "2026-04-12T15:00:00.000Z"
  }
];

const reviews: RetentionReview[] = [
  {
    id: 41,
    card_id: 22,
    user_reasoning: "I thought bigger mass always means bigger acceleration.",
    ai_feedback: "Mass resists acceleration, so the same force produces less acceleration when mass rises.",
    created_at: "2026-04-11T18:10:00.000Z"
  }
];

describe("RetentionWorkspace", () => {
  it("renders deck controls, active card review, and latest feedback in the same shell", () => {
    const html = renderToStaticMarkup(
      React.createElement(RetentionWorkspace, {
        decks,
        cards,
        reviews,
        selectedDeckId: 7,
        selectedCardId: 22,
        draftDeckName: "Dynamics",
        draftQuestion: "What does F = ma describe?",
        draftAnswer: "The net force on an object equals mass times acceleration.",
        reasoningDraft: "I thought bigger mass always means bigger acceleration.",
        latestFeedback: "Mass resists acceleration, so the same force produces less acceleration when mass rises.",
        busy: false,
        error: null,
        onDraftDeckNameChange: () => undefined,
        onDraftQuestionChange: () => undefined,
        onDraftAnswerChange: () => undefined,
        onReasoningDraftChange: () => undefined,
        onCreateDeck: () => undefined,
        onCreateCard: () => undefined,
        onGenerateFeedback: () => undefined,
        onSelectDeck: () => undefined,
        onSelectCard: () => undefined,
        onDeleteDeck: () => undefined,
        onDeleteCard: () => undefined
      })
    );

    expect(html).toContain("Retention study");
    expect(html).toContain("Newton");
    expect(html).toContain("What does F = ma describe?");
    expect(html).toContain("Review this reasoning");
    expect(html).toContain("Mass resists acceleration");
  });
});
