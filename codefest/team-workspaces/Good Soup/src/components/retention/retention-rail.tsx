import type { RetentionCard, RetentionReview } from "@/lib/retention/types";

function formatDate(value?: string): string {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function RetentionRail({
  selectedCard,
  reviews,
  latestFeedback
}: {
  selectedCard: RetentionCard | null;
  reviews: RetentionReview[];
  latestFeedback: string | null;
}) {
  if (!selectedCard) {
    return (
      <aside className="resources-rail">
        <div className="rail-empty-state">
          <h2 className="resources-rail__title" style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>No active card selected</h2>
          <p className="resources-rail__copy" style={{ margin: 0 }}>
            Pick a deck and a card to review recall history, answer keys, and coaching notes.
          </p>
        </div>
      </aside>
    );
  }

  const latestReview = reviews[0] ?? null;

  return (
    <aside className="resources-rail">
      <div className="resources-rail__card">
        <p className="resources-rail__eyebrow">Retention context</p>
        <h2 className="resources-rail__title">{selectedCard.question}</h2>
        <p className="resources-rail__copy">
          Keep the main thread clean and use this rail for answer keys, review timing, and coaching.
        </p>
      </div>

      <div className="resources-rail__card">
        <p className="resources-rail__eyebrow">Answer key</p>
        <p className="resources-rail__copy">{selectedCard.answer}</p>
      </div>

      <div className="resources-rail__card">
        <p className="resources-rail__eyebrow">Next review</p>
        <p className="resources-rail__copy">{formatDate(selectedCard.next_review)}</p>
        <p className="resources-rail__copy">Current streak: {selectedCard.streak ?? 0}</p>
      </div>

      <div className="resources-rail__card">
        <p className="resources-rail__eyebrow">Latest coaching</p>
        <p className="resources-rail__copy">
          {latestFeedback ?? latestReview?.ai_feedback ?? "No coaching generated yet."}
        </p>
      </div>
    </aside>
  );
}
