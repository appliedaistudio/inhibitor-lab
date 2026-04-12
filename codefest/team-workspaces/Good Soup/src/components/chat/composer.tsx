import { useId, useRef } from "react";

import type { ChangeEvent, KeyboardEvent } from "react";

import type { AttachmentReference, CompanionMode } from "@/types/companion";

import { AttachmentPill } from "./attachment-pill";

export interface ComposerProps {
  mode: CompanionMode;
  pendingAttachments: AttachmentReference[];
  value: string;
  onChange: (value: string) => void;
  onPickFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSubmit: () => void;
}

export function Composer({
  mode,
  pendingAttachments,
  value,
  onChange,
  onPickFiles,
  onRemoveAttachment,
  onSubmit
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const hasText = value.trim().length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && hasText) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer-shell">
        <span aria-hidden="true" className="composer-shell__icon">⌕</span>

        <textarea
          id={textareaId}
          className="composer-shell__textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "research"
              ? "Ask a research question, explore a paper, or test an idea…"
              : "Ask a reasoning question or test your understanding…"
          }
          rows={1}
        />

        <div className="composer-shell__actions">
          <button
            className="composer-shell__attach-btn"
            type="button"
            title="Attach files"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="composer-shell__attach-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={onPickFiles}
            aria-label="Attach files"
          />
          <button
            className="composer-shell__submit"
            type="button"
            disabled={!hasText}
            onClick={onSubmit}
          >
            Send
          </button>
        </div>
      </div>

      {pendingAttachments.length > 0 && (
        <div className="composer-attachments">
          {pendingAttachments.map((attachment) => (
            <AttachmentPill
              key={attachment.id}
              attachment={attachment}
              onRemove={() => onRemoveAttachment(attachment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
