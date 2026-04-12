import type { CompanionPipelineResult } from "@/types/companion";

import { buildAssistantTurnView } from "./presenters";
import { toVisibleModeLabel } from "./mode-label";

export function StatusStrip({
  result,
  showProcess,
  onToggleProcess
}: {
  result: CompanionPipelineResult | null;
  showProcess: boolean;
  onToggleProcess: () => void;
}) {
  if (!result) {
    return null;
  }

  const view = buildAssistantTurnView(result);
  const modeLabel = toVisibleModeLabel(result.mode);
  const citationCount = view.citations.length;
  const summary = citationCount > 0 ? `${citationCount} cited source${citationCount === 1 ? "" : "s"}` : null;

  return (
    <div className="message-card" style={{ maxWidth: "100%" }}>
      <div className="message-card-header">
        <div className="status-strip__mode-group">
          <span className="status-strip__mode">{modeLabel}</span>
          {summary ? <span className="status-strip__summary">{summary}</span> : null}
        </div>

        <button className="debug-link" onClick={onToggleProcess} type="button">
          {showProcess ? "Hide work" : "Show work"}
        </button>
      </div>
    </div>
  );
}
