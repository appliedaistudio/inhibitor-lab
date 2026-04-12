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

export function ProcessDropdown({ messages }: { messages: ProcessMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="process-dropdown">
        <div className="process-dropdown__header">
          <span className="badge allow">work</span>
          <span className="process-dropdown__subhead">Internal workflow</span>
        </div>
        <p className="process-dropdown__empty">
          No process data yet. Send a message to inspect the live trace.
        </p>
      </div>
    );
  }

  return (
    <div className="process-dropdown">
      <div className="process-dropdown__header">
        <span className="badge allow">work</span>
        <span className="process-dropdown__subhead">
          Internal workflow · {messages.length} events
        </span>
      </div>

      <div className="process-dropdown__list">
        {messages.map((message) => (
          <article className="process-dropdown__item" key={message.id}>
            <div className="process-dropdown__item-head">
              <h3 className="process-dropdown__item-title">{message.title}</h3>
              <span className="process-dropdown__item-time">
                {formatProcessTimestamp(message.created_at)}
              </span>
            </div>
            <div className="process-dropdown__item-participant">
              {formatParticipant(message.participant)}
            </div>
            <p className="process-dropdown__item-body">{message.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
