import { AssistantAnswer } from "./assistant-answer";
import { BrandMark } from "./brand-mark";
import { buildAssistantTurnView } from "./presenters";
import type { ChatThreadMessage } from "./chat-thread";

export function AssistantTurn({
  message,
  onRegenerate
}: {
  message: ChatThreadMessage;
  onRegenerate: (messageId: string) => void;
}) {
  const view = message.result ? buildAssistantTurnView(message.result) : null;
  const answer = view?.answer ?? message.content;
  const timestamp = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="assistant-turn">
      <BrandMark variant="veritas" className="assistant-turn__avatar" alt="Veritas" />

      <div className="assistant-turn__content">
        <div className="assistant-turn__bubble">
          <div className="assistant-turn__body">
            <AssistantAnswer answer={answer} />
          </div>
        </div>

        <div className="assistant-turn__footer">
          <span className="assistant-turn__timestamp">{timestamp}</span>
          {message.result && (
            <button className="assistant-turn__regen-btn" onClick={() => onRegenerate(message.id)} type="button">
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
