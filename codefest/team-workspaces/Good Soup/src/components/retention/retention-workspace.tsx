import type { RetentionCard, RetentionDeck, RetentionReview } from "@/lib/retention/types";

function formatDate(value?: string): string {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function RetentionWorkspace({
  decks,
  cards,
  reviews,
  selectedDeckId,
  selectedCardId,
  draftDeckName,
  draftQuestion,
  draftAnswer,
  reasoningDraft,
  latestFeedback,
  busy,
  error,
  onDraftDeckNameChange,
  onDraftQuestionChange,
  onDraftAnswerChange,
  onReasoningDraftChange,
  onCreateDeck,
  onCreateCard,
  onGenerateFeedback,
  onSelectDeck,
  onSelectCard,
  onDeleteDeck,
  onDeleteCard
}: {
  decks: RetentionDeck[];
  cards: RetentionCard[];
  reviews: RetentionReview[];
  selectedDeckId: number | null;
  selectedCardId: number | null;
  draftDeckName: string;
  draftQuestion: string;
  draftAnswer: string;
  reasoningDraft: string;
  latestFeedback: string | null;
  busy: boolean;
  error: string | null;
  onDraftDeckNameChange: (value: string) => void;
  onDraftQuestionChange: (value: string) => void;
  onDraftAnswerChange: (value: string) => void;
  onReasoningDraftChange: (value: string) => void;
  onCreateDeck: () => void;
  onCreateCard: () => void;
  onGenerateFeedback: () => void;
  onSelectDeck: (deckId: number) => void;
  onSelectCard: (cardId: number) => void;
  onDeleteDeck: (deckId: number) => void;
  onDeleteCard: (cardId: number) => void;
}) {
  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) ?? null;
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const latestReview = reviews[0] ?? null;

  return (
    <section className="retention-workspace">
      <header className="retention-workspace__header">
        <div>
          <p className="retention-workspace__eyebrow">Retention study</p>
          <h1 className="retention-workspace__title">
            {selectedDeck ? selectedDeck.name : "Build your first recall deck"}
          </h1>
          <p className="retention-workspace__copy">
            Create decks, store question and answer pairs, then review student reasoning with a
            dedicated coaching pass.
          </p>
        </div>
        <div className="retention-workspace__status">
          <span className={`badge ${busy ? "revise" : "allow"}`}>{busy ? "syncing" : "ready"}</span>
          <span className="badge allow">{cards.length} cards</span>
        </div>
      </header>

      <div className="retention-grid">
        <section className="retention-panel">
          <div className="retention-panel__header">
            <div>
              <p className="retention-panel__eyebrow">Decks</p>
              <h2 className="retention-panel__title">Create or switch decks</h2>
            </div>
          </div>

          <div className="retention-inline-form">
            <input
              className="session-input"
              value={draftDeckName}
              onChange={(event) => onDraftDeckNameChange(event.target.value)}
              placeholder="Create a deck"
            />
            <button className="debug-toggle-btn" type="button" onClick={onCreateDeck}>
              Add deck
            </button>
          </div>

          <div className="retention-list">
            {decks.length === 0 ? (
              <p className="retention-empty">No decks yet.</p>
            ) : (
              decks.map((deck) => (
                <div
                  className={`retention-list-item ${deck.id === selectedDeckId ? "active" : ""}`}
                  key={deck.id}
                >
                  <button className="retention-list-item__body" type="button" onClick={() => onSelectDeck(deck.id)}>
                    <span className="retention-list-item__title">{deck.name}</span>
                    <span className="retention-list-item__meta">Deck #{deck.id}</span>
                  </button>
                  <button className="debug-link" type="button" onClick={() => onDeleteDeck(deck.id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="retention-panel">
          <div className="retention-panel__header">
            <div>
              <p className="retention-panel__eyebrow">Cards</p>
              <h2 className="retention-panel__title">Add prompts to the active deck</h2>
            </div>
          </div>

          <div className="retention-form-stack">
            <textarea
              className="chat-textarea retention-textarea"
              value={draftQuestion}
              onChange={(event) => onDraftQuestionChange(event.target.value)}
              placeholder="Card question"
            />
            <textarea
              className="chat-textarea retention-textarea"
              value={draftAnswer}
              onChange={(event) => onDraftAnswerChange(event.target.value)}
              placeholder="Card answer key"
            />
            <button
              className="debug-toggle-btn"
              type="button"
              onClick={onCreateCard}
              disabled={!selectedDeck}
            >
              Add card
            </button>
          </div>

          <div className="retention-list">
            {cards.length === 0 ? (
              <p className="retention-empty">
                {selectedDeck ? "No cards in this deck yet." : "Pick a deck to start adding cards."}
              </p>
            ) : (
              cards.map((card) => (
                <div
                  className={`retention-list-item ${card.id === selectedCardId ? "active" : ""}`}
                  key={card.id}
                >
                  <button className="retention-list-item__body" type="button" onClick={() => onSelectCard(card.id)}>
                    <span className="retention-list-item__title">{card.question}</span>
                    <span className="retention-list-item__meta">
                      Next review: {formatDate(card.next_review)}
                    </span>
                  </button>
                  <button className="debug-link" type="button" onClick={() => onDeleteCard(card.id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="retention-panel">
        <div className="retention-panel__header">
          <div>
            <p className="retention-panel__eyebrow">Review</p>
            <h2 className="retention-panel__title">
              {selectedCard ? "Review this reasoning" : "Select a card to start a review"}
            </h2>
          </div>
        </div>

        {selectedCard ? (
          <>
            <div className="retention-selected-card">
              <p className="retention-selected-card__question">{selectedCard.question}</p>
              <p className="retention-selected-card__answer">{selectedCard.answer}</p>
            </div>

            <textarea
              className="chat-textarea retention-textarea retention-textarea--large"
              value={reasoningDraft}
              onChange={(event) => onReasoningDraftChange(event.target.value)}
              placeholder="Paste the student's reasoning to get targeted coaching."
            />

            <div className="retention-review-actions">
              <button className="debug-toggle-btn" type="button" onClick={onGenerateFeedback}>
                Review this reasoning
              </button>
              {latestReview?.created_at && (
                <span className="retention-review-meta">
                  Latest logged review: {formatDate(latestReview.created_at)}
                </span>
              )}
            </div>

            <div className="retention-feedback-card">
              <p className="retention-panel__eyebrow">Coaching output</p>
              <p className="retention-feedback-card__body">
                {latestFeedback ?? latestReview?.ai_feedback ?? "Run a review to generate coaching."}
              </p>
            </div>
          </>
        ) : (
          <p className="retention-empty">
            The review surface stays hidden until a retention card is selected.
          </p>
        )}

        {error && <div className="chat-error">{error}</div>}
      </section>
    </section>
  );
}
