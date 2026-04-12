"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import type { RetentionCard, RetentionDeck, RetentionReview, SuggestedCard } from "@/lib/retention/types";
import { buildStudyCardUpdate, type StudyRating } from "./retention-study";
import { StudyReviewPanel } from "./study-review-panel";

type DeckMode = "default" | "managing" | "studying";

interface SessionUser {
  id?: number | string;
}

interface JsonEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

async function readData<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as JsonEnvelope<T>;

  if (!response.ok || !payload.ok || typeof payload.data === "undefined") {
    throw new Error(payload.error ?? "Retention request failed.");
  }

  return payload.data;
}

async function readOk(input: RequestInfo | URL, init?: RequestInit): Promise<void> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as JsonEnvelope<never>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Retention request failed.");
  }
}

async function readFeedback(input: {
  question: string;
  answer: string;
  user_reasoning: string;
}): Promise<string> {
  const response = await fetch("/api/retention/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { ok?: boolean; feedback?: string; error?: string };

  if (!response.ok || !payload.ok || typeof payload.feedback !== "string") {
    throw new Error(payload.error ?? "Retention coaching request failed.");
  }

  return payload.feedback;
}

async function readSuggestions(input: {
  question: string;
  answer: string;
  user_reasoning: string;
}): Promise<SuggestedCard[]> {
  const response = await fetch("/api/retention/suggest-cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { ok?: boolean; suggestions?: SuggestedCard[]; error?: string };

  if (!response.ok || !payload.ok || !Array.isArray(payload.suggestions)) {
    throw new Error(payload.error ?? "Retention suggestions request failed.");
  }

  return payload.suggestions;
}

function buildEndOfDay(): string {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.toISOString();
}

function formatShortDate(value?: string): string {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DecksView() {
  const { data: session, status } = useSession();
  const [decks, setDecks] = useState<RetentionDeck[]>([]);
  const [cards, setCards] = useState<RetentionCard[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);
  const [activeDeckName, setActiveDeckName] = useState("");
  const [loading, setLoading] = useState(true);
  const [newDeckName, setNewDeckName] = useState("");
  const [newCardQuestion, setNewCardQuestion] = useState("");
  const [newCardAnswer, setNewCardAnswer] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [mode, setMode] = useState<DeckMode>("default");
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentStudyCard, setCurrentStudyCard] = useState<RetentionCard | null>(null);
  const [studyRating, setStudyRating] = useState<Exclude<StudyRating, "easy"> | null>(null);
  const [reasoningDraft, setReasoningDraft] = useState("");
  const [coachingFeedback, setCoachingFeedback] = useState<string | null>(null);
  const [coachingError, setCoachingError] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [queuedCards, setQueuedCards] = useState<RetentionCard[] | null>(null);
  const [suggestedCards, setSuggestedCards] = useState<SuggestedCard[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editCardQuestion, setEditCardQuestion] = useState("");
  const [editCardAnswer, setEditCardAnswer] = useState("");

  const userId = Number((session?.user as SessionUser | undefined)?.id);

  async function fetchDecks() {
    if (!Number.isFinite(userId) || userId <= 0) {
      return;
    }

    try {
      setLoading(true);
      const data = await readData<RetentionDeck[]>(
        `/api/retention/decks?userId=${userId}&endOfDay=${encodeURIComponent(buildEndOfDay())}`
      );
      setDecks(data);
    } catch (error) {
      console.error("Failed to fetch decks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCards(deckId: number) {
    try {
      setLoading(true);
      const data = await readData<RetentionCard[]>(`/api/retention/cards?deckId=${deckId}`);
      setCards(data);
    } catch (error) {
      console.error("Failed to fetch cards:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDueCards(deckId: number) {
    try {
      setLoading(true);
      const data = await readData<RetentionCard[]>(
        `/api/retention/cards?deckId=${deckId}&endOfDay=${encodeURIComponent(buildEndOfDay())}`
      );
      setCards(data);
    } catch (error) {
      console.error("Failed to fetch due cards:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && Number.isFinite(userId) && userId > 0) {
      void fetchDecks();
      return;
    }

    if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, userId]);

  function resetDeckMode() {
    setActiveDeckId(null);
    setActiveDeckName("");
    setCards([]);
    setCurrentStudyCard(null);
    setIsFlipped(false);
    resetStudyReviewState();
    setMode("default");
    setEditingCardId(null);
  }

  function resetStudyReviewState() {
    setStudyRating(null);
    setReasoningDraft("");
    setCoachingFeedback(null);
    setCoachingError(null);
    setReviewBusy(false);
    setQueuedCards(null);
    setSuggestedCards([]);
    setSuggesting(false);
    setEditingCardId(null);
  }

  async function handleCreateDeck(event: React.FormEvent) {
    event.preventDefault();
    if (!newDeckName.trim() || !Number.isFinite(userId) || userId <= 0) {
      return;
    }

    try {
      setIsCreating(true);
      await readData<RetentionDeck>("/api/retention/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name: newDeckName.trim() }),
      });
      setNewDeckName("");
      await fetchDecks();
    } catch (error) {
      console.error("Failed to create deck:", error);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteDeck(deckId: number) {
    if (!window.confirm("Are you sure you want to delete this deck? All cards and reviews will be lost.")) {
      return;
    }

    try {
      await readOk(`/api/retention/decks?id=${deckId}`, { method: "DELETE" });
      if (activeDeckId === deckId) {
        resetDeckMode();
      }
      await fetchDecks();
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  }

  async function handleManageDeck(deckId: number, deckName: string) {
    setActiveDeckId(deckId);
    setActiveDeckName(deckName);
    await fetchCards(deckId);
    setMode("managing");
  }

  function pickRandomCard(nextCards = cards) {
    if (nextCards.length === 0) {
      setCurrentStudyCard(null);
      return;
    }

    const randomIndex = Math.floor(Math.random() * nextCards.length);
    setCurrentStudyCard(nextCards[randomIndex]);
    setIsFlipped(false);
  }

  function advanceStudyQueue(nextCards: RetentionCard[]) {
    setCards(nextCards);
    resetStudyReviewState();
    pickRandomCard(nextCards);
  }

  useEffect(() => {
    if (mode === "studying" && cards.length > 0 && !currentStudyCard) {
      pickRandomCard(cards);
    }
  }, [cards, currentStudyCard, mode]);

  async function handleStudyDeck(deckId: number, deckName: string) {
    setActiveDeckId(deckId);
    setActiveDeckName(deckName);
    setCurrentStudyCard(null);
    setIsFlipped(false);
    resetStudyReviewState();
    await fetchDueCards(deckId);
    setMode("studying");
  }

  async function handleCreateCard(event: React.FormEvent) {
    event.preventDefault();
    if (!newCardQuestion.trim() || !newCardAnswer.trim() || !activeDeckId) {
      return;
    }

    try {
      setIsCreating(true);
      const card = await readData<RetentionCard>("/api/retention/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: activeDeckId,
          question: newCardQuestion.trim(),
          answer: newCardAnswer.trim(),
        }),
      });

      await readData<RetentionReview>("/api/retention/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.id }),
      });

      setNewCardQuestion("");
      setNewCardAnswer("");
      await fetchCards(activeDeckId);
    } catch (error) {
      console.error("Failed to create card:", error);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteCard(cardId: number) {
    if (!activeDeckId || !window.confirm("Delete this card forever?")) {
      return;
    }

    try {
      await readOk(`/api/retention/cards?id=${cardId}`, { method: "DELETE" });
      await fetchCards(activeDeckId);
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  }

  function startEditingCard(card: RetentionCard) {
    setEditingCardId(card.id);
    setEditCardQuestion(card.question);
    setEditCardAnswer(card.answer);
  }

  async function handleUpdateCard(event: React.FormEvent, cardId: number) {
    event.preventDefault();
    if (!activeDeckId || !editCardQuestion.trim() || !editCardAnswer.trim()) {
      return;
    }

    try {
      setIsCreating(true);
      await readData<RetentionCard>("/api/retention/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cardId,
          question: editCardQuestion.trim(),
          answer: editCardAnswer.trim(),
        }),
      });
      setEditingCardId(null);
      await fetchCards(activeDeckId);
    } catch (error) {
      console.error("Failed to update card:", error);
    } finally {
      setIsCreating(false);
    }
  }

  async function persistStudyCard(card: RetentionCard, rating: StudyRating): Promise<RetentionCard[]> {
    await readData<RetentionCard>("/api/retention/cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, ...buildStudyCardUpdate(card, rating, new Date()) }),
    });

    if (!activeDeckId) {
      return [];
    }

    const dueCards = await readData<RetentionCard[]>(
      `/api/retention/cards?deckId=${activeDeckId}&endOfDay=${encodeURIComponent(buildEndOfDay())}`
    );
    await fetchDecks();
    return dueCards;
  }

  function beginStudyReview(rating: Exclude<StudyRating, "easy">) {
    setStudyRating(rating);
    setReasoningDraft("");
    setCoachingFeedback(null);
    setCoachingError(null);
    setQueuedCards(null);
  }

  async function handleEasyClick(card: RetentionCard) {
    try {
      const dueCards = await persistStudyCard(card, "easy");
      advanceStudyQueue(dueCards);
    } catch (error) {
      console.error("Failed to update card:", error);
    }
  }

  async function handleSkipCoaching() {
    if (!currentStudyCard || studyRating !== "medium") {
      return;
    }

    try {
      setReviewBusy(true);
      const dueCards = await persistStudyCard(currentStudyCard, "medium");
      advanceStudyQueue(dueCards);
    } catch (error) {
      setCoachingError(error instanceof Error ? error.message : "Failed to continue study session.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleSubmitCoaching() {
    if (!currentStudyCard || !studyRating) {
      return;
    }

    if (!reasoningDraft.trim()) {
      return;
    }

    setReviewBusy(true);
    setCoachingError(null);

    let feedbackMessage: string | null = null;
    let reviewId: number | null = null;
    let surfacedError: string | null = null;

    try {
      try {
        const review = await readData<RetentionReview>("/api/retention/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_id: currentStudyCard.id })
        });
        reviewId = review.id;
      } catch (error) {
        surfacedError = error instanceof Error ? error.message : "Failed to create review record.";
      }

      try {
        feedbackMessage = await readFeedback({
          question: currentStudyCard.question,
          answer: currentStudyCard.answer,
          user_reasoning: reasoningDraft.trim()
        });
      } catch (error) {
        surfacedError = error instanceof Error ? error.message : "Failed to generate retention coaching.";
      }

      if (reviewId) {
        try {
          await readData<RetentionReview>("/api/retention/reviews", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: reviewId,
              user_reasoning: reasoningDraft.trim(),
              ...(feedbackMessage ? { ai_feedback: feedbackMessage } : {})
            })
          });
        } catch (error) {
          console.error("Failed to persist retention review feedback:", error);
        }
      }

      const dueCards = await persistStudyCard(currentStudyCard, studyRating);
      setQueuedCards(dueCards);
      setCoachingFeedback(feedbackMessage);
      setCoachingError(surfacedError);
    } catch (error) {
      setCoachingError(error instanceof Error ? error.message : "Failed to continue study session.");
    } finally {
      setReviewBusy(false);
    }
  }

  function handleContinueAfterCoaching() {
    if (!queuedCards) {
      return;
    }

    advanceStudyQueue(queuedCards);
  }

  async function handleFetchSuggestions() {
    if (!currentStudyCard || !reasoningDraft.trim()) {
      return;
    }

    try {
      setSuggesting(true);
      const suggestions = await readSuggestions({
        question: currentStudyCard.question,
        answer: currentStudyCard.answer,
        user_reasoning: reasoningDraft.trim()
      });
      setSuggestedCards(suggestions);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAcceptSuggestion(suggestedCard: SuggestedCard) {
    if (!activeDeckId) {
      return;
    }

    try {
      const card = await readData<RetentionCard>("/api/retention/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: activeDeckId,
          question: suggestedCard.question,
          answer: suggestedCard.answer,
        }),
      });

      await readData<RetentionReview>("/api/retention/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.id }),
      });

      setSuggestedCards(current => current.filter(c => c !== suggestedCard));
    } catch (error) {
      console.error("Failed to accept suggestion:", error);
    }
  }

  function handleRejectSuggestion(suggestedCard: SuggestedCard) {
    setSuggestedCards(current => current.filter(c => c !== suggestedCard));
  }

  async function onHardClick() {
    beginStudyReview("hard");
  }

  async function onMediumClick() {
    beginStudyReview("medium");
  }

  if (status === "loading") {
    return (
      <div className="decks-layout-wrapper">
        <div className="decks-loading-spinner" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="decks-layout-wrapper centered">
        <div className="decks-auth-gate">
          <h2>Sign in to study your decks</h2>
          <p>You need to be logged in to create and review flashcards.</p>
        </div>
      </div>
    );
  }

  if (activeDeckId !== null && mode === "managing") {
    return (
      <div className="decks-layout-wrapper">
        <div className="decks-header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="deck-btn-back" onClick={resetDeckMode} type="button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="decks-title">{activeDeckName}</h1>
          </div>
        </div>

        <div className="cards-creator-section">
          <h3>Add New Card</h3>
          <form className="create-card-form" onSubmit={(event) => void handleCreateCard(event)}>
            <input
              type="text"
              className="create-deck-input"
              placeholder="Question..."
              value={newCardQuestion}
              onChange={(event) => setNewCardQuestion(event.target.value)}
              disabled={isCreating}
            />
            <input
              type="text"
              className="create-deck-input"
              placeholder="Answer..."
              value={newCardAnswer}
              onChange={(event) => setNewCardAnswer(event.target.value)}
              disabled={isCreating}
            />
            <button
              type="submit"
              className="create-deck-submit"
              disabled={isCreating || !newCardQuestion.trim() || !newCardAnswer.trim()}
            >
              Add Card
            </button>
          </form>
        </div>

        {loading ? (
          <div className="decks-loading-spinner" style={{ marginTop: "3rem" }} />
        ) : cards.length === 0 ? (
          <div className="decks-empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              className="empty-icon"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <h3>No cards yet</h3>
            <p>Add some flashcards to start learning!</p>
          </div>
        ) : (
          <div className="cards-grid">
            {cards.map((card) => (
              <div key={card.id} className="card-item">
                {editingCardId === card.id ? (
                  <form
                    className="card-item-content"
                    onSubmit={(event) => void handleUpdateCard(event, card.id)}
                    style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}
                  >
                    <input
                      type="text"
                      className="create-deck-input"
                      value={editCardQuestion}
                      onChange={(event) => setEditCardQuestion(event.target.value)}
                      placeholder="Question..."
                    />
                    <input
                      type="text"
                      className="create-deck-input"
                      value={editCardAnswer}
                      onChange={(event) => setEditCardAnswer(event.target.value)}
                      placeholder="Answer..."
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" className="create-deck-submit" style={{ flex: 1, padding: "0.4rem" }}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="create-deck-submit"
                        style={{ flex: 1, padding: "0.4rem", backgroundColor: "var(--text-tertiary)" }}
                        onClick={() => setEditingCardId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="card-item-content">
                      <span className="card-item-q">{card.question}</span>
                      <span className="card-item-a">{card.answer}</span>
                      <span className="card-item-meta">Streak: {card.streak ?? 0}</span>
                      <span className="card-item-meta">Next Review: {formatShortDate(card.next_review)}</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="card-btn-delete"
                        onClick={() => startEditingCard(card)}
                        aria-label="Edit card"
                        type="button"
                        style={{ color: "var(--accent)" }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          viewBox="0 0 24 24"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="card-btn-delete"
                        onClick={() => void handleDeleteCard(card.id)}
                        aria-label="Delete card"
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          viewBox="0 0 24 24"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeDeckId !== null && mode === "studying") {
    return (
      <div className="decks-layout-wrapper">
        <div className="decks-header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="deck-btn-back" onClick={resetDeckMode} type="button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="decks-title">{activeDeckName} - Studying</h1>
          </div>
        </div>

        {loading ? (
          <div className="decks-loading-spinner" style={{ marginTop: "3rem" }} />
        ) : cards.length === 0 ? (
          <div className="decks-empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              className="empty-icon"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <h3>All caught up!</h3>
            <p>No more cards to review in this deck today.</p>
          </div>
        ) : currentStudyCard ? (
          <div
            className="study-card-container"
            style={{ maxWidth: "600px", margin: "2rem auto", textAlign: "center", width: "100%" }}
          >
            <div
              className={`study-card ${isFlipped ? "flipped" : ""}`}
              onClick={() => setIsFlipped((value) => !value)}
              style={{
                padding: "4rem 2rem",
                backgroundColor: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid black",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              }}
            >
              {isFlipped ?
                <>
                  <h2 style={{ textDecoration: 'underline', textUnderlineOffset: '6px' }}>
                    {currentStudyCard.question}
                  </h2>
                  <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 500, lineHeight: 1.4 }}>
                    {currentStudyCard.answer}
                  </h2>
                </>
                :
                <h2 style={{
                  margin: 0,
                  fontSize: '2rem',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}>
                  {currentStudyCard.question}
                </h2>
              }
              <p
                style={{
                  marginTop: "2rem",
                  color: "var(--text-tertiary, var(--ink-soft))",
                  fontSize: "0.875rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                {isFlipped ? "Answer" : "Question"}
              </p>
            </div>

            {isFlipped ? (
              studyRating ? (
                <StudyReviewPanel
                  rating={studyRating}
                  reasoningDraft={reasoningDraft}
                  feedback={coachingFeedback}
                  error={coachingError}
                  busy={reviewBusy}
                  canContinue={Boolean(queuedCards)}
                  suggestions={suggestedCards}
                  suggesting={suggesting}
                  onReasoningChange={setReasoningDraft}
                  onSubmit={() => void handleSubmitCoaching()}
                  onSkip={() => void handleSkipCoaching()}
                  onContinue={handleContinueAfterCoaching}
                  onFetchSuggestions={() => void handleFetchSuggestions()}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                />
              ) : (
                <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void onHardClick();
                    }}
                    style={{
                      padding: "1rem 2rem",
                      backgroundColor: "var(--surface)",
                      color: "#b42318",
                      border: "1px solid black",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "1rem",
                    }}
                    type="button"
                  >
                    Hard
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void onMediumClick();
                    }}
                    style={{
                      padding: "1rem 2rem",
                      backgroundColor: "var(--surface)",
                      color: "#b58105",
                      border: "1px solid black",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "1rem",
                    }}
                    type="button"
                  >
                    Medium
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleEasyClick(currentStudyCard);
                    }}
                    style={{
                      padding: "1rem 2rem",
                      backgroundColor: "var(--surface)",
                      color: "#0b8a44",
                      border: "1px solid black",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "1rem",
                    }}
                    type="button"
                  >
                    Easy
                  </button>
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="decks-layout-wrapper">
      <div className="decks-header-bar">
        <h1 className="decks-title">Your Study Decks</h1>

        <form className="create-deck-form" onSubmit={(event) => void handleCreateDeck(event)}>
          <input
            type="text"
            className="create-deck-input"
            placeholder="New deck name..."
            value={newDeckName}
            onChange={(event) => setNewDeckName(event.target.value)}
            disabled={isCreating}
          />
          <button type="submit" className="create-deck-submit" disabled={isCreating || !newDeckName.trim()}>
            {isCreating ? "Adding..." : "Add Deck"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="decks-loading-spinner" style={{ marginTop: "3rem" }} />
      ) : decks.length === 0 ? (
        <div className="decks-empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            className="empty-icon"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
          </svg>
          <h3>No decks yet</h3>
          <p>Create your first deck above to start improving your retention.</p>
        </div>
      ) : (
        <div className="decks-grid">
          {decks.map((deck) => (
            <div key={deck.id} className="deck-card">
              <div className="deck-card-top">
                <h3 className="deck-card-name">{deck.name}</h3>
                <span>To Do: {deck.cards_to_review ?? 0}</span>
                <span className="deck-card-date">Created {formatShortDate(deck.created_at)}</span>
                <button
                  className="deck-btn-delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDeleteDeck(deck.id);
                  }}
                  aria-label="Delete deck"
                  title="Delete deck"
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
              <div className="deck-card-bottom">
                <button
                  className="deck-btn-review"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleStudyDeck(deck.id, deck.name);
                  }}
                  type="button"
                >
                  Study Cards
                </button>
                <button
                  className="deck-btn-manage"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleManageDeck(deck.id, deck.name);
                  }}
                  type="button"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
