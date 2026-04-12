import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RetentionRail } from "../src/components/retention/retention-rail";
import type { RetentionCard, RetentionReview } from "../src/lib/retention/types";

const card: RetentionCard = {
  id: 22,
  deck_id: 7,
  question: "What does F = ma describe?",
  answer: "The net force on an object equals mass times acceleration.",
  streak: 2,
  next_review: "2026-04-12T15:00:00.000Z"
};

const reviews: RetentionReview[] = [
  {
    id: 41,
    card_id: 22,
    user_reasoning: "I thought bigger mass always means bigger acceleration.",
    ai_feedback: "Mass resists acceleration, so the same force produces less acceleration when mass rises.",
    created_at: "2026-04-11T18:10:00.000Z"
  }
];

describe("RetentionRail", () => {
  it("keeps retention context in the side rail rather than the main thread", () => {
    const html = renderToStaticMarkup(
      React.createElement(RetentionRail, {
        selectedCard: card,
        reviews,
        latestFeedback: "Mass resists acceleration, so the same force produces less acceleration when mass rises."
      })
    );

    expect(html).toContain("Retention context");
    expect(html).toContain("Answer key");
    expect(html).toContain("Next review");
    expect(html).toContain("Latest coaching");
    expect(html).toContain("Mass resists acceleration");
  });
});
