import type { RetentionDeck } from "@/lib/retention/types";

function buildDeckButtonStyle(isActive: boolean) {
  return {
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "stretch",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${isActive ? "rgba(14, 128, 116, 0.35)" : "var(--line)"}`,
    background: isActive ? "rgba(14, 128, 116, 0.09)" : "rgba(255, 255, 255, 0.5)",
    color: "var(--ink)",
    boxShadow: isActive ? "0 1px 6px rgba(16, 34, 44, 0.08)" : "none",
    cursor: "pointer",
    textAlign: "left" as const
  };
}

export function RetentionSidebar({
  decks,
  selectedDeckId,
  busy,
  onRefresh,
  onSelectDeck
}: {
  decks: RetentionDeck[];
  selectedDeckId: number | null;
  busy: boolean;
  onRefresh: () => void;
  onSelectDeck: (deckId: number) => void;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="sidebar-divider" />

      <div className="session-field" style={{ padding: "0 20px", marginBottom: 12 }}>
        <label htmlFor="refresh-retention-button">Retention decks</label>
        <button
          id="refresh-retention-button"
          className="debug-toggle-btn"
          onClick={onRefresh}
          type="button"
          style={{ width: "100%", marginTop: 4 }}
        >
          {busy ? "Refreshing…" : "Refresh decks"}
        </button>
      </div>

      <div
        style={{
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 0,
          overflowY: "auto"
        }}
      >
        {decks.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: "0.85rem" }}>
            No decks yet. Create one in the retention workspace.
          </p>
        ) : (
          decks.map((deck) => {
            const isActive = deck.id === selectedDeckId;

            return (
              <button
                key={deck.id}
                type="button"
                onClick={() => onSelectDeck(deck.id)}
                aria-current={isActive ? "true" : undefined}
                style={buildDeckButtonStyle(isActive)}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: isActive ? "var(--accent-strong)" : "var(--ink-soft)"
                  }}
                >
                  deck
                </span>
                <span style={{ fontSize: "0.92rem", fontWeight: 600, lineHeight: 1.35 }}>
                  {deck.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
