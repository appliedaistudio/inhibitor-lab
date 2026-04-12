import { forwardRef } from "react";
import { useSession } from "next-auth/react";

import type {
  AttachmentReference,
  CompanionPipelineResult,
  ProcessMessage
} from "@/types/companion";

import { AssistantTurn } from "./assistant-turn";
import { toVisibleModeLabel } from "./mode-label";
import { buildProcessMessages } from "./presenters";
import { ProcessDropdown } from "./process-dropdown";
import { StatusStrip } from "./status-strip";

export interface ChatThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AttachmentReference[];
  result?: CompanionPipelineResult;
  timestamp: Date;
}

export interface ChatThreadProps {
  messages: ChatThreadMessage[];
  activeResult: CompanionPipelineResult | null;
  showProcess: boolean;
  onToggleProcess: () => void;
  onRegenerate: (messageId: string) => void;
  pending?: boolean;
}

function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UserBubbleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.5 19.5a4.5 4.5 0 0 0-9 0" />
      <circle cx="12" cy="8.5" r="3.25" />
    </svg>
  );
}

function UserAvatar({ image, fallback }: { image?: string | null; fallback: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt="User avatar"
        className="user-turn__avatar-img"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className="user-turn__avatar-fallback">
      {fallback}
    </div>
  );
}

export const ChatThread = forwardRef<HTMLDivElement, ChatThreadProps>(function ChatThread(
  { messages, activeResult, showProcess, onToggleProcess, onRegenerate, pending = false },
  ref
) {
  const { data: session } = useSession();
  const hasMessages = messages.length > 0;

  return (
    <div className="chat-thread" ref={ref}>
      <StatusStrip result={activeResult} showProcess={showProcess} onToggleProcess={onToggleProcess} />

      {showProcess && <ProcessDropdown messages={activeResult ? buildProcessMessages(activeResult) : []} />}

      {hasMessages ? (
        <>
          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.role}`}>
              {message.role === "user" ? (
                <div className="user-turn">
                  <div className="user-turn__content">
                    <div className="user-turn__bubble">
                      <p className="user-turn__text">{message.content}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="user-turn__attachments">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="user-turn__attachment-chip">
                              <span className="user-turn__attachment-name">{attachment.name}</span>
                              <span className="user-turn__attachment-meta">
                                {attachment.mime_type} · {formatAttachmentSize(attachment.size_bytes)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="user-turn__avatar">
                    {session?.user ? (
                      <UserAvatar
                        image={session.user.image}
                        fallback={session.user.name?.[0] ?? session.user.email?.[0] ?? "?"}
                      />
                    ) : (
                      <UserBubbleIcon />
                    )}
                  </span>
                </div>
              ) : (
                <AssistantTurn message={message} onRegenerate={onRegenerate} />
              )}
            </div>
          ))}
        </>
      ) : (
        <div className="chat-home">
          <div className="chat-home__eyebrow">VERITAS</div>
          <p className="chat-home__sub">Guided research, {toVisibleModeLabel("learning").toLowerCase()}, and retention.</p>
        </div>
      )}

      {pending && (
        <div className="thinking-row" style={{ justifyContent: hasMessages ? "flex-start" : "center" }}>
          <div className="thinking-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  );
});
