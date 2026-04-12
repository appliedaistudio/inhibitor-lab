import type { ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getCoachingPolicy, type StudyRating } from "./retention-study";
import type { SuggestedCard } from "@/lib/retention/types";

export function StudyReviewPanel({
  rating,
  reasoningDraft,
  feedback,
  error,
  busy,
  canContinue,
  suggestions = [],
  suggesting = false,
  onReasoningChange,
  onSubmit,
  onSkip,
  onContinue,
  onFetchSuggestions,
  onAcceptSuggestion,
  onRejectSuggestion
}: {
  rating: Exclude<StudyRating, "easy">;
  reasoningDraft: string;
  feedback: string | null;
  error: string | null;
  busy: boolean;
  canContinue: boolean;
  suggestions?: SuggestedCard[];
  suggesting?: boolean;
  onReasoningChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onContinue: () => void;
  onFetchSuggestions?: () => void;
  onAcceptSuggestion?: (card: SuggestedCard) => void;
  onRejectSuggestion?: (card: SuggestedCard) => void;
}) {
  const policy = getCoachingPolicy(rating);
  const hasResolution = Boolean(feedback || error);

  return (
    <section className="study-review-panel">
      {!hasResolution ? (
        <>
          <p className="study-review-panel__eyebrow">{rating === "hard" ? "Required before the next card" : "Optional reflection"}</p>
          <h3 className="study-review-panel__title">
            {rating === "hard" ? "Tell Veritas what led you to the wrong answer" : "Tell Veritas where your reasoning drifted"}
          </h3>
          <p className="study-review-panel__copy">
            {rating === "hard"
              ? "A short explanation helps Veritas point out the specific misconception before you move on."
              : "If you want a quick correction before the next card, explain the near-miss in one or two sentences."}
          </p>
          <textarea
            className="study-review-panel__textarea"
            value={reasoningDraft}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onReasoningChange(event.target.value)}
            placeholder="I got this wrong because..."
          />
          <div className="study-review-panel__actions">
            <button
              className="study-review-panel__primary"
              type="button"
              disabled={busy || !reasoningDraft.trim()}
              onClick={onSubmit}
            >
              {busy ? "Coaching..." : "Get coaching"}
            </button>
            {policy.canSkip ? (
              <button className="study-review-panel__secondary" type="button" disabled={busy} onClick={onSkip}>
                Skip coaching
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="study-review-panel__eyebrow">Your reasoning</p>
          <p className="study-review-panel__copy" style={{ marginBottom: '2rem' }}>
            {reasoningDraft}
          </p>

          <p className="study-review-panel__eyebrow">Veritas coaching</p>
          <h3 className="study-review-panel__title">
            {error ? "Coaching could not be generated this turn" : "Veritas"}
          </h3>
          <div className={`study-review-panel__feedback assistant-turn__markdown ${error ? "error" : ""}`}>
            {error ? error : <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback ?? ""}</ReactMarkdown>}
          </div>

          {suggestions.length > 0 && (
            <div className="study-review-panel__suggestions" style={{ marginTop: '2rem' }}>
              <p className="study-review-panel__eyebrow">Suggested targeted cards</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {suggestions.map((card, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    border: '1px solid rgba(16, 34, 44, 0.1)',
                    borderRadius: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.5)',
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Q: {card.question}</p>
                    <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.9rem' }}>A: {card.answer}</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="study-review-panel__primary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => onAcceptSuggestion?.(card)}
                      >
                        Add to deck
                      </button>
                      <button
                        className="study-review-panel__secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => onRejectSuggestion?.(card)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canContinue ? (
            <div className="study-review-panel__actions">
              <button className="study-review-panel__primary" type="button" onClick={onContinue} disabled={busy || suggesting}>
                Next card
              </button>
              <button className="study-review-panel__secondary" type="button" onClick={onSubmit} disabled={busy || suggesting}>
                {busy ? "Regenerating..." : "Regenerate"}
              </button>
              {!error && suggestions.length === 0 && (
                <button
                  className="study-review-panel__secondary"
                  type="button"
                  onClick={onFetchSuggestions}
                  disabled={busy || suggesting}
                  style={{ border: '1px solid var(--accent)', color: 'var(--accent-strong)' }}
                >
                  {suggesting ? "Generating cards..." : "Suggest targeted cards"}
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
