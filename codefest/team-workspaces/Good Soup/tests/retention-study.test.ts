import { describe, expect, it } from "vitest";

import type { RetentionCard } from "../src/lib/retention/types";
import { buildStudyCardUpdate, getCoachingPolicy } from "../src/components/retention/retention-study";

const baseCard: RetentionCard = {
  id: 22,
  deck_id: 7,
  question: "What does F = ma describe?",
  answer: "Net force equals mass times acceleration.",
  streak: 2,
  times_seen: 2
};

describe("retention study helpers", () => {
  it("requires coaching for hard misses and allows skipping it for medium misses", () => {
    expect(getCoachingPolicy("hard")).toMatchObject({
      requiresReasoning: true,
      canSkip: false
    });

    expect(getCoachingPolicy("medium")).toMatchObject({
      requiresReasoning: false,
      canSkip: true
    });

    expect(getCoachingPolicy("easy")).toMatchObject({
      requiresReasoning: false,
      canSkip: false
    });
  });

  it("builds the correct spaced-repetition updates for each study rating", () => {
    const now = new Date("2026-04-12T12:00:00.000Z");

    expect(buildStudyCardUpdate(baseCard, "hard", now)).toEqual({
      streak: 0,
      times_seen: 3,
      next_review: "2026-04-12T12:01:00.000Z"
    });

    expect(buildStudyCardUpdate(baseCard, "medium", now)).toEqual({
      streak: 1,
      times_seen: 3,
      next_review: "2026-04-12T12:05:00.000Z"
    });

    expect(buildStudyCardUpdate(baseCard, "easy", now)).toEqual({
      streak: 3,
      times_seen: 3,
      next_review: "2026-04-12T12:15:00.000Z"
    });
  });
});
