import type { CompanionMode, SessionMessageRecord } from "@/types/companion";

import { buildSessionResourceLedger } from "./session-resource-ledger";
import { toVisibleModeLabel } from "./mode-label";

function LibraryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CollapseRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ResourcesRail({
  thread,
  mode,
  collapsed,
  onToggleCollapse,
}: {
  thread: SessionMessageRecord[];
  mode: CompanionMode;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const view = buildSessionResourceLedger(thread);

  if (collapsed) {
    return (
      <aside className="resources-rail resources-rail--collapsed">
        <button
          className="resources-rail__toggle resources-rail__toggle--collapsed"
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand resources"
          title="Sources & citations"
        >
          <span className="resources-rail__toggle-icon resources-rail__toggle-icon--active" aria-hidden="true">
            <LibraryIcon />
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="resources-rail">
      <div className="rail-header">
        <div className="resources-rail__heading">
          <span className="resources-rail__toggle-icon" aria-hidden="true">
            <LibraryIcon />
          </span>
          <span className="rail-header__label">Resources</span>
        </div>
        <button
          className="rail-collapse-btn"
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse resources"
          title="Collapse"
        >
          <CollapseRightIcon />
        </button>
      </div>

      {view.items.length === 0 ? (
        <div className="rail-empty-state">
          <h2 className="resources-rail__title" style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>
            No session resources yet
          </h2>
          <p className="resources-rail__copy" style={{ margin: 0 }}>
            Public citations and further reading will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="resources-rail__card">
            <p className="resources-rail__eyebrow">
              {mode === "research" ? "Sources and citations" : `${toVisibleModeLabel(mode)} support`}
            </p>
            <p className="resources-rail__copy">
              {view.citationCount > 0
                ? `${view.citationCount} cited resource${view.citationCount === 1 ? "" : "s"} in the final answer.`
                : "No cited resources in the latest answer."}
            </p>
          </div>

          {view.items.map((item) => (
            <article className="resources-rail__card resources-rail__card--resource" key={item.canonicalUrl}>
              <div className="resources-rail__meta">
                <span className={`resources-rail__badge ${item.kind === "citation" ? "is-cited" : ""}`}>
                  {item.kind === "citation" ? "Cited" : "Further reading"}
                </span>
                {item.publishedYear ? <span className="resources-rail__source">{item.publishedYear}</span> : null}
              </div>
              <h3 className="resources-rail__resource-title">{item.title}</h3>
              <p className="resources-rail__copy">{item.snippet}</p>
              {item.authors.length > 0 ? (
                <p className="resources-rail__copy" style={{ marginTop: "-0.35rem" }}>
                  {item.authors.join(", ")}
                  {item.venue ? ` · ${item.venue}` : ""}
                </p>
              ) : item.venue ? (
                <p className="resources-rail__copy" style={{ marginTop: "-0.35rem" }}>
                  {item.venue}
                </p>
              ) : null}
              <a
                className="resources-rail__link"
                href={item.canonicalUrl}
                rel="noreferrer"
                target="_blank"
              >
                {item.venue ?? item.canonicalUrl}
              </a>
            </article>
          ))}
        </>
      )}
    </aside>
  );
}
