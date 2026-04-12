import type { ProcessMessage } from "@/types/companion";

function formatProcessTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatParticipant(participant: ProcessMessage["participant"]): string {
  return participant.replace(/_/g, " ");
}

export function ProcessTrace({ messages }: { messages: ProcessMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="message-card" style={{ maxWidth: "100%" }}>
        <div className="message-card-header">
          <span className="badge allow">process</span>
          <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>Process trace</span>
        </div>
        <div className="message-card-body">
          <p className="message-answer" style={{ marginBottom: 0 }}>
            No process data yet. Send a message to inspect the live trace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-card" style={{ maxWidth: "100%" }}>
      <div className="message-card-header">
        <span className="badge allow">process</span>
        <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
          Process trace · {messages.length} events
        </span>
      </div>

      <div className="message-card-body" style={{ display: "grid", gap: 10 }}>
        {messages.map((message) => (
          <article
            key={message.id}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(16, 34, 44, 0.1)",
              background: "rgba(255, 255, 255, 0.7)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.3 }}>
                {message.title}
              </h3>
              <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)", fontFamily: "var(--mono)" }}>
                {formatProcessTimestamp(message.created_at)}
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {formatParticipant(message.participant)}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "0.88rem", lineHeight: 1.5 }}>
              {message.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
