import type { RetentionCard } from "@/lib/retention/types";

export type StudyRating = "hard" | "medium" | "easy";

export interface StudyCardUpdate {
  streak: number;
  times_seen: number;
  next_review: string;
}

export interface CoachingPolicy {
  requiresReasoning: boolean;
  canSkip: boolean;
  showPanel: boolean;
}

export function getCoachingPolicy(rating: StudyRating): CoachingPolicy {
  if (rating === "hard") {
    return {
      requiresReasoning: true,
      canSkip: false,
      showPanel: true
    };
  }

  if (rating === "medium") {
    return {
      requiresReasoning: false,
      canSkip: true,
      showPanel: true
    };
  }

  return {
    requiresReasoning: false,
    canSkip: false,
    showPanel: false
  };
}

export function buildStudyCardUpdate(card: RetentionCard, rating: StudyRating, now = new Date()): StudyCardUpdate {
  const timesSeen = (card.times_seen ?? 0) + 1;

  if (rating === "hard") {
    return {
      streak: 0,
      times_seen: timesSeen,
      next_review: new Date(now.getTime() + 60 * 1000).toISOString()
    };
  }

  if (rating === "medium") {
    return {
      streak: Math.max(0, (card.streak ?? 0) - 1),
      times_seen: timesSeen,
      next_review: new Date(now.getTime() + 5 * 60 * 1000).toISOString()
    };
  }

  const streak = (card.streak ?? 0) + 1;

  let nextReview: Date;
  switch (timesSeen) {
    case 1:
      nextReview = new Date(now.getTime() + 1 * 60 * 1000);
      break;
    case 2:
      nextReview = new Date(now.getTime() + 10 * 60 * 1000);
      break;
    case 3:
      nextReview = new Date(now.getTime() + 15 * 60 * 1000);
      break;
    default:
      nextReview = new Date(now);
      nextReview.setDate(now.getDate() + Math.min(30, Math.pow(2, streak)));
      break;
  }

  return {
    streak,
    times_seen: timesSeen,
    next_review: nextReview.toISOString()
  };
}
