import OpenAI from "openai";

import { getRuntimeConfig } from "../companion/config";

import { getRetentionPool } from "./db";
import type {
  CreateCardInput,
  CreateDeckInput,
  CreateReviewInput,
  RetentionCard,
  RetentionDeck,
  RetentionFeedbackInput,
  RetentionReview,
  SuggestedCard,
  UpdateCardInput,
  UpdateReviewInput,
} from "./types";

function getOpenAIClient(): OpenAI {
  const config = getRuntimeConfig();
  if (!config.openai_api_key) {
    throw new Error("OpenAI API key is required for retention feedback generation");
  }

  return new OpenAI({
    apiKey: config.openai_api_key,
    ...(config.llm_base_url ? { baseURL: config.llm_base_url } : {}),
  });
}

export async function listDecks(input: {
  userId: number;
  endOfDay?: string;
}): Promise<RetentionDeck[]> {
  const result = await getRetentionPool().query<RetentionDeck>(
    `SELECT
       d.*,
       CAST((
         SELECT COUNT(*)
         FROM cards c
         WHERE c.deck_id = d.id
           AND c.next_review <= COALESCE($2::timestamp, NOW())
       ) AS INTEGER) AS cards_to_review
     FROM decks d
     WHERE d.user_id = $1
     ORDER BY d.created_at DESC, d.id DESC`,
    [input.userId, input.endOfDay ?? null]
  );
  return result.rows;
}

export async function createDeck(input: CreateDeckInput): Promise<RetentionDeck> {
  const result = await getRetentionPool().query<RetentionDeck>(
    "INSERT INTO decks (user_id, name) VALUES ($1, $2) RETURNING *",
    [input.user_id, input.name]
  );
  return result.rows[0];
}

export async function deleteDeck(deckId: number): Promise<{ deleted: boolean }> {
  const client = await getRetentionPool().connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM reviews WHERE card_id IN (SELECT id FROM cards WHERE deck_id = $1)",
      [deckId]
    );
    await client.query("DELETE FROM cards WHERE deck_id = $1", [deckId]);
    const result = await client.query("DELETE FROM decks WHERE id = $1 RETURNING id", [deckId]);
    await client.query("COMMIT");
    return { deleted: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listCards(input: {
  cardId?: number;
  deckId?: number;
  endOfDay?: string;
}): Promise<RetentionCard[]> {
  if (input.cardId) {
    const result = await getRetentionPool().query<RetentionCard>(
      "SELECT * FROM cards WHERE id = $1",
      [input.cardId]
    );
    return result.rows;
  }

  if (input.deckId) {
    const result = await getRetentionPool().query<RetentionCard>(
      `SELECT *
       FROM cards
       WHERE deck_id = $1
         AND ($2::timestamp IS NULL OR next_review <= $2::timestamp)
       ORDER BY created_at DESC, id DESC`,
      [input.deckId, input.endOfDay ?? null]
    );
    return result.rows;
  }

  throw new Error("Either cardId or deckId is required");
}

export async function createCard(input: CreateCardInput): Promise<RetentionCard> {
  const result = await getRetentionPool().query<RetentionCard>(
    "INSERT INTO cards (deck_id, question, answer) VALUES ($1, $2, $3) RETURNING *",
    [input.deck_id, input.question, input.answer]
  );
  return result.rows[0];
}

export async function updateCard(input: UpdateCardInput): Promise<RetentionCard | null> {
  const result = await getRetentionPool().query<RetentionCard>(
    `UPDATE cards
     SET
       question = COALESCE($1, question),
       answer = COALESCE($2, answer),
       streak = COALESCE($3, streak),
       next_review = COALESCE($4, next_review),
       times_seen = COALESCE($5, times_seen)
     WHERE id = $6
     RETURNING *`,
    [
      input.question ?? null,
      input.answer ?? null,
      input.streak ?? null,
      input.next_review ?? null,
      input.times_seen ?? null,
      input.id,
    ]
  );
  return result.rows[0] ?? null;
}

export async function deleteCard(cardId: number): Promise<{ deleted: boolean }> {
  const client = await getRetentionPool().connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM reviews WHERE card_id = $1", [cardId]);
    const result = await client.query("DELETE FROM cards WHERE id = $1 RETURNING id", [cardId]);
    await client.query("COMMIT");
    return { deleted: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listReviews(cardId: number): Promise<RetentionReview[]> {
  const result = await getRetentionPool().query<RetentionReview>(
    "SELECT * FROM reviews WHERE card_id = $1 ORDER BY created_at DESC, id DESC",
    [cardId]
  );
  return result.rows;
}

export async function createReview(input: CreateReviewInput): Promise<RetentionReview> {
  const result = await getRetentionPool().query<RetentionReview>(
    "INSERT INTO reviews (card_id) VALUES ($1) RETURNING *",
    [input.card_id]
  );
  return result.rows[0];
}

export async function updateReview(input: UpdateReviewInput): Promise<RetentionReview | null> {
  const result = await getRetentionPool().query<RetentionReview>(
    `UPDATE reviews
     SET
       user_reasoning = COALESCE($1, user_reasoning),
       ai_feedback = COALESCE($2, ai_feedback)
     WHERE id = $3
     RETURNING *`,
    [input.user_reasoning ?? null, input.ai_feedback ?? null, input.id]
  );
  return result.rows[0] ?? null;
}

export async function generateRetentionFeedback(
  input: RetentionFeedbackInput
): Promise<string> {
  const config = getRuntimeConfig();
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: config.primary_model,
    messages: [
      {
        role: "system",
        content: `You are a helpful tutor. The user is studying flashcards and got a card partially or wholy wrong. 
                    They have provided their reasoning for why they were confused or what they thought the answer was. 
                    Your job is to read the question, the real answer, and their reasoning. Provide short, encouraging feedback 
                    that clears up their specific confusion or misconception and give tips on how to remember the answer. Do not prompt for any follow up questions`},
      {
        role: "user",
        content:
          `Flashcard Question: ${input.question}\nActual Answer: ${input.answer}\nStudent Reasoning: ${input.user_reasoning}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function generateSuggestedCards(
  input: RetentionFeedbackInput
): Promise<SuggestedCard[]> {
  const config = getRuntimeConfig();
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: config.primary_model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert educational designer. 
        The student is studying flashcards and has a specific misconception.
        You have provided feedback to clear up that misconception.
        Now, generate exactly 3 targeted flashcards (Question/Answer pairs) that test the specific concept they struggled with.
        Isolate the key relationship or fact they missed.
        Tailor cards towards the student's reasoning (not generic).
        Test the exact concept they misunderstood.
        Return your response in strict JSON format: { "cards": [{ "question": "...", "answer": "..." }] }`
      },
      {
        role: "user",
        content: `Flashcard: ${input.question}\nAnswer: ${input.answer}\nStudent Reasoning: ${input.user_reasoning}`
      }
    ]
  });

  try {
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    if (Array.isArray(raw.cards)) {
      return raw.cards.map((c: any) => ({
        question: String(c.question ?? ""),
        answer: String(c.answer ?? "")
      })).filter((c: { question: string; answer: string }) => c.question && c.answer);
    }
  } catch (error) {
    console.error("Failed to parse suggested cards:", error);
  }

  return [];
}
