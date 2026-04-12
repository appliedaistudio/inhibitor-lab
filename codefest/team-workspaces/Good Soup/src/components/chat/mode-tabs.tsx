import type { CompanionMode } from "@/types/companion";

export function ModeTabs({
  mode,
  onChangeMode
}: {
  mode: CompanionMode;
  onChangeMode: (mode: CompanionMode) => void;
}) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Conversation mode">
      <button
        className={`mode-tab${mode === "research" ? " mode-tab--active" : ""}`}
        onClick={() => onChangeMode("research")}
        type="button"
        role="tab"
        aria-selected={mode === "research"}
      >
        Research
      </button>
      <button
        className={`mode-tab${mode === "learning" ? " mode-tab--active" : ""}`}
        onClick={() => onChangeMode("learning")}
        type="button"
        role="tab"
        aria-selected={mode === "learning"}
      >
        Socratic
      </button>
    </div>
  );
}
