export interface RetentionDeck {
  id: number;
  user_id: number;
  name: string;
  cards_to_review?: number;
  created_at?: string;
}

export interface RetentionCard {
  id: number;
  deck_id: number;
  question: string;
  answer: string;
  streak?: number;
  times_seen?: number;
  next_review?: string;
  created_at?: string;
}

export interface RetentionReview {
  id: number;
  card_id: number;
  user_reasoning?: string | null;
  ai_feedback?: string | null;
  created_at?: string;
}

export interface CreateDeckInput {
  user_id: number;
  name: string;
}

export interface CreateCardInput {
  deck_id: number;
  question: string;
  answer: string;
}

export interface UpdateCardInput {
  id: number;
  question?: string;
  answer?: string;
  streak?: number;
  times_seen?: number;
  next_review?: string;
}

export interface CreateReviewInput {
  card_id: number;
}

export interface UpdateReviewInput {
  id: number;
  user_reasoning?: string;
  ai_feedback?: string;
}

export interface RetentionFeedbackInput {
  question: string;
  answer: string;
  user_reasoning: string;
}

export interface SuggestedCard {
  question: string;
  answer: string;
}
