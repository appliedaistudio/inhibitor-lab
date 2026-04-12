import type { AttachmentReference } from "@/types/companion";

function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPill({
  attachment,
  onRemove
}: {
  attachment: AttachmentReference;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "100%",
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(16, 34, 44, 0.12)",
        background: "rgba(255, 255, 255, 0.7)",
        color: "var(--ink)"
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.2, wordBreak: "break-word" }}>
          {attachment.name}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", fontFamily: "var(--mono)" }}>
          {attachment.mime_type} · {formatAttachmentSize(attachment.size_bytes)}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="debug-link"
        style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
      >
        Remove
      </button>
    </div>
  );
}
