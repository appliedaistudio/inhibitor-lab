import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/retention/service", () => ({
  listDecks: vi.fn(),
  createDeck: vi.fn(),
  deleteDeck: vi.fn(),
  listCards: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  listReviews: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  generateRetentionFeedback: vi.fn(),
}));

import {
  createCard,
  createDeck,
  createReview,
  deleteCard,
  deleteDeck,
  generateRetentionFeedback,
  listCards,
  listDecks,
  listReviews,
  updateCard,
  updateReview,
} from "../src/lib/retention/service";

import { DELETE as deleteDeckRoute, GET as getDecksRoute, POST as postDeckRoute } from "../src/app/api/retention/decks/route";
import { DELETE as deleteCardRoute, GET as getCardsRoute, PATCH as patchCardRoute, POST as postCardRoute } from "../src/app/api/retention/cards/route";
import { GET as getReviewsRoute, PATCH as patchReviewRoute, POST as postReviewRoute } from "../src/app/api/retention/reviews/route";
import { POST as postFeedbackRoute } from "../src/app/api/retention/feedback/route";

function jsonRequest(url: string, body?: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("retention routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns decks for a user", async () => {
    vi.mocked(listDecks).mockResolvedValue([{ id: 1, user_id: 4, name: "Dynamics" }]);

    const res = await getDecksRoute(new Request("http://localhost/api/retention/decks?userId=4"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listDecks).toHaveBeenCalledWith({ userId: 4, endOfDay: undefined });
    expect(body).toMatchObject({ ok: true, data: [{ id: 1, name: "Dynamics" }] });
  });

  it("returns decks with due-today counts when an end-of-day filter is provided", async () => {
    vi.mocked(listDecks).mockResolvedValue([
      { id: 1, user_id: 4, name: "Dynamics", cards_to_review: 3 }
    ]);

    const res = await getDecksRoute(
      new Request("http://localhost/api/retention/decks?userId=4&endOfDay=2026-04-12T23:59:59.999Z")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listDecks).toHaveBeenCalledWith({
      userId: 4,
      endOfDay: "2026-04-12T23:59:59.999Z"
    });
    expect(body).toMatchObject({ ok: true, data: [{ id: 1, cards_to_review: 3 }] });
  });

  it("creates a deck", async () => {
    vi.mocked(createDeck).mockResolvedValue({ id: 9, user_id: 4, name: "Optics" });

    const res = await postDeckRoute(jsonRequest("http://localhost/api/retention/decks", { user_id: 4, name: "Optics" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(createDeck).toHaveBeenCalledWith({ user_id: 4, name: "Optics" });
    expect(body).toMatchObject({ ok: true, data: { id: 9, name: "Optics" } });
  });

  it("deletes a deck", async () => {
    vi.mocked(deleteDeck).mockResolvedValue({ deleted: true });

    const res = await deleteDeckRoute(new Request("http://localhost/api/retention/decks?id=12", { method: "DELETE" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(deleteDeck).toHaveBeenCalledWith(12);
    expect(body).toMatchObject({ ok: true });
  });

  it("lists cards by deck id", async () => {
    vi.mocked(listCards).mockResolvedValue([{ id: 3, deck_id: 12, question: "Q", answer: "A" }]);

    const res = await getCardsRoute(new Request("http://localhost/api/retention/cards?deckId=12"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listCards).toHaveBeenCalledWith({ deckId: 12, endOfDay: undefined });
    expect(body).toMatchObject({ ok: true, data: [{ id: 3 }] });
  });

  it("lists only cards due by the supplied end-of-day boundary", async () => {
    vi.mocked(listCards).mockResolvedValue([
      { id: 3, deck_id: 12, question: "Q", answer: "A", times_seen: 2 }
    ]);

    const res = await getCardsRoute(
      new Request("http://localhost/api/retention/cards?deckId=12&endOfDay=2026-04-12T23:59:59.999Z")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listCards).toHaveBeenCalledWith({
      deckId: 12,
      endOfDay: "2026-04-12T23:59:59.999Z"
    });
    expect(body).toMatchObject({ ok: true, data: [{ id: 3, times_seen: 2 }] });
  });

  it("creates and updates cards", async () => {
    vi.mocked(createCard).mockResolvedValue({ id: 7, deck_id: 12, question: "What is F=ma?", answer: "Newton's second law" });
    vi.mocked(updateCard).mockResolvedValue({
      id: 7,
      deck_id: 12,
      question: "What is F = ma?",
      answer: "Newton's second law",
      streak: 2,
      times_seen: 3
    });

    const createRes = await postCardRoute(
      jsonRequest("http://localhost/api/retention/cards", { deck_id: 12, question: "What is F=ma?", answer: "Newton's second law" })
    );
    const createBody = await createRes.json();

    expect(createRes.status).toBe(201);
    expect(createBody).toMatchObject({ ok: true, data: { id: 7 } });

    const updateRes = await patchCardRoute(
      jsonRequest("http://localhost/api/retention/cards", { id: 7, streak: 2, times_seen: 3 }, "PATCH")
    );
    const updateBody = await updateRes.json();

    expect(updateRes.status).toBe(200);
    expect(updateCard).toHaveBeenCalledWith({ id: 7, streak: 2, times_seen: 3 });
    expect(updateBody).toMatchObject({ ok: true, data: { id: 7, streak: 2, times_seen: 3 } });
  });

  it("deletes cards", async () => {
    vi.mocked(deleteCard).mockResolvedValue({ deleted: true });

    const res = await deleteCardRoute(new Request("http://localhost/api/retention/cards?id=7", { method: "DELETE" }));

    expect(res.status).toBe(200);
    expect(deleteCard).toHaveBeenCalledWith(7);
  });

  it("lists and updates reviews", async () => {
    vi.mocked(listReviews).mockResolvedValue([{ id: 8, card_id: 7, user_reasoning: "I mixed up force and acceleration." }]);
    vi.mocked(createReview).mockResolvedValue({ id: 8, card_id: 7 });
    vi.mocked(updateReview).mockResolvedValue({ id: 8, card_id: 7, ai_feedback: "Focus on the ratio between force and mass." });

    const getRes = await getReviewsRoute(new Request("http://localhost/api/retention/reviews?cardId=7"));
    expect(getRes.status).toBe(200);
    expect(listReviews).toHaveBeenCalledWith(7);

    const createRes = await postReviewRoute(jsonRequest("http://localhost/api/retention/reviews", { card_id: 7 }));
    expect(createRes.status).toBe(201);
    expect(createReview).toHaveBeenCalledWith({ card_id: 7 });

    const updateRes = await patchReviewRoute(
      jsonRequest("http://localhost/api/retention/reviews", { id: 8, ai_feedback: "Focus on the ratio between force and mass." }, "PATCH")
    );
    expect(updateRes.status).toBe(200);
    expect(updateReview).toHaveBeenCalledWith({ id: 8, ai_feedback: "Focus on the ratio between force and mass." });
  });

  it("returns generated retention feedback", async () => {
    vi.mocked(generateRetentionFeedback).mockResolvedValue("You confused net force with acceleration. Rework the proportionality.");

    const res = await postFeedbackRoute(
      jsonRequest("http://localhost/api/retention/feedback", {
        question: "What happens to acceleration if force doubles and mass doubles?",
        answer: "It stays the same.",
        user_reasoning: "I thought more force always means more acceleration.",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(generateRetentionFeedback).toHaveBeenCalledWith({
      question: "What happens to acceleration if force doubles and mass doubles?",
      answer: "It stays the same.",
      user_reasoning: "I thought more force always means more acceleration.",
    });
    expect(body).toMatchObject({ ok: true, feedback: expect.any(String) });
  });
});
