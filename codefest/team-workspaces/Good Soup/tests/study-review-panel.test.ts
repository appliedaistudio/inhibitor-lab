import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StudyReviewPanel } from "../src/components/retention/study-review-panel";

describe("StudyReviewPanel", () => {
  it("renders a required reflection step for hard misses", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudyReviewPanel, {
        rating: "hard",
        reasoningDraft: "",
        feedback: null,
        error: null,
        busy: false,
        canContinue: false,
        onReasoningChange: () => undefined,
        onSubmit: () => undefined,
        onSkip: () => undefined,
        onContinue: () => undefined
      })
    );

    expect(html).toContain("Tell Veritas what led you to the wrong answer");
    expect(html).toContain("Required before the next card");
    expect(html).not.toContain("Skip coaching");
  });

  it("renders coaching output and a continue action after feedback is ready", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudyReviewPanel, {
        rating: "medium",
        reasoningDraft: "I mixed up force with acceleration.",
        feedback: "You treated force as if it guaranteed more acceleration without checking the mass term.",
        error: null,
        busy: false,
        canContinue: true,
        onReasoningChange: () => undefined,
        onSubmit: () => undefined,
        onSkip: () => undefined,
        onContinue: () => undefined
      })
    );

    expect(html).toContain("Veritas");
    expect(html).toContain("mass term");
    expect(html).toContain("Next card");
  });
});
