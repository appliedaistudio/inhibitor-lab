import { groupSessionsForDisplay } from "./session-workspace-presenters";
import { toVisibleModeLabel } from "./mode-label";
import { showDialog } from "@/components/ui/dialog";
import { useState } from "react";
import type { SessionWorkspaceEntry } from "@/types/companion";

function formatSessionTime(touchedAt: string): string {
  return new Date(touchedAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg 
      className={`folder-chevron ${collapsed ? "collapsed" : ""}`} 
      viewBox="0 0 16 16"
    >
      <polyline points="4 6 8 10 12 6" />
    </svg>
  );
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  busy = false,
  onSelectSession,
  onStartNew,
  onRenameSession,
  onMoveSession,
  onArchiveSession,
  onRestoreSession,
  onDeleteSession
}: {
  sessions: SessionWorkspaceEntry[];
  activeSessionId: string | null;
  busy?: boolean;
  onSelectSession: (sessionId: string) => void | Promise<void>;
  onStartNew: (folder?: string | null) => void | Promise<void>;
  onRenameSession: (sessionId: string, title: string) => void | Promise<void>;
  onMoveSession: (sessionId: string, folder: string | null) => void | Promise<void>;
  onArchiveSession: (sessionId: string) => void | Promise<void>;
  onRestoreSession: (sessionId: string) => void | Promise<void>;
  onDeleteSession: (sessionId: string) => void | Promise<void>;
}) {
  const grouped = groupSessionsForDisplay(sessions);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);

  const allFolders = Array.from(
    new Set([
      ...customFolders,
      ...sessions.map((s) => s.folder).filter((f): f is string => typeof f === "string" && f.trim() !== "")
    ])
  ).sort();

  function handleAddFolder() {
    showDialog({
      variant: "prompt",
      title: "New folder",
      confirmLabel: "Create",
      onConfirm: (name) => {
        if (!name?.trim()) return;
        const trimmedName = name.trim();
        const exists = allFolders.some(f => f.toLowerCase() === trimmedName.toLowerCase());
        if (exists) {
          showDialog({
            variant: "alert",
            title: "Folder already exists",
            body: `A folder named "${trimmedName}" already exists.`,
            onConfirm: () => undefined
          });
          return;
        }
        setCustomFolders((prev) => Array.from(new Set([...prev, trimmedName])));
      }
    });
  }

  function handleDeleteFolder(folderName: string, folderSessions: SessionWorkspaceEntry[]) {
    showDialog({
      variant: "confirm",
      title: `Delete "${folderName}"?`,
      body: folderSessions.length > 0
        ? `This folder contains ${folderSessions.length} thread${folderSessions.length === 1 ? "" : "s"}.`
        : undefined,
      confirmLabel: "Delete folder",
      danger: true,
      onConfirm: () => {
        if (folderSessions.length === 0) {
          setCustomFolders((prev) => prev.filter((f) => f !== folderName));
          return;
        }
        showDialog({
          variant: "confirm",
          title: "Also delete threads?",
          body: `Permanently delete ${folderSessions.length} thread${folderSessions.length === 1 ? "" : "s"} inside, or move them to Ungrouped?`,
          confirmLabel: "Delete threads",
          cancelLabel: "Move to Ungrouped",
          danger: true,
          onConfirm: () => {
            setCustomFolders((prev) => prev.filter((f) => f !== folderName));
            folderSessions.forEach((s) => void onDeleteSession(s.session_id));
          },
          onCancel: () => {
            setCustomFolders((prev) => prev.filter((f) => f !== folderName));
            folderSessions.forEach((s) => void onMoveSession(s.session_id, null));
          }
        });
      }
    });
  }

  function toggleGroup(label: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  function requestRename(session: SessionWorkspaceEntry) {
    showDialog({
      variant: "prompt",
      title: "Rename thread",
      defaultValue: session.title,
      confirmLabel: "Rename",
      onConfirm: (value) => {
        if (!value?.trim() || value.trim() === session.title) return;
        void onRenameSession(session.session_id, value.trim());
      }
    });
  }

  function requestArchive(session: SessionWorkspaceEntry) {
    void onArchiveSession(session.session_id);
  }

  function requestRestore(session: SessionWorkspaceEntry) {
    void onRestoreSession(session.session_id);
  }

  function requestDelete(session: SessionWorkspaceEntry) {
    showDialog({
      variant: "confirm",
      title: `Delete "${session.title}"?`,
      body: "This permanently removes the saved thread.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => void onDeleteSession(session.session_id)
    });
  }

  return (
    <section className="session-sidebar">
      <div className="sidebar-divider" />
      <div className="session-sidebar__new session-field">
        <div className="sidebar-header-row">
          <label htmlFor="new-thread-button">Threads</label>
          <div className="sidebar-header-row__actions">
            <button
              id="new-thread-button"
              className="session-sidebar__icon-btn"
              disabled={busy}
              onClick={() => void onStartNew(null)}
              type="button"
              title="New thread"
              aria-label="New thread"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button className="add-folder-btn" onClick={handleAddFolder} title="New folder" aria-label="New folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="session-sidebar__list">
        {grouped.active.length === 0 && grouped.archived.length === 0 ? (
          <p className="session-sidebar__empty">No saved threads yet.</p>
        ) : null}

        {grouped.active.map((group) => {
          const isCollapsed = collapsedGroups.has(group.label);
          const isCustomFolder = allFolders.includes(group.label);

          return (
            <div className="session-group" key={`active-${group.label}`}>
              <div className="folder-header-row">
                <button 
                  type="button" 
                  className="session-folder-btn"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="session-folder-btn__label">{group.label}</span>
                </button>
                <div className="folder-header-row__actions">
                  <button
                    className="folder-chevron-btn"
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-label={isCollapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
                    title={isCollapsed ? "Expand" : "Collapse"}
                  >
                    <ChevronIcon collapsed={isCollapsed} />
                  </button>
                  <button
                    className="session-group__add-btn"
                    type="button"
                    title={`New session in ${group.label}`}
                    aria-label={`New session in ${group.label}`}
                    onClick={() => void onStartNew(group.folder)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  {isCustomFolder ? (
                    <button
                      className="folder-delete-btn"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteFolder(group.label, group.sessions);
                      }}
                      title="Delete folder"
                      aria-label={`Delete ${group.label}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  ) : (
                    <span className="folder-delete-placeholder" aria-hidden="true" />
                  )}
                </div>
              </div>

            {!collapsedGroups.has(group.label) && (
              <div className="folder-content">
                {group.sessions.map((session) => {
                  const isActive = session.session_id === activeSessionId;
                  return (
                    <div
                      key={session.session_id}
                      className={`session-item${isActive ? " session-item--active" : ""}`}
                      onClick={() => void onSelectSession(session.session_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void onSelectSession(session.session_id);
                        }
                      }}
                      aria-current={isActive ? "true" : undefined}
                    >
                      <div className="session-item__row">
                        <span className="session-item__mode">{toVisibleModeLabel(session.mode)}</span>
                        <span className="session-item__time">{formatSessionTime(session.touched_at)}</span>
                      </div>
                      <span className="session-item__title">{session.title}</span>
                      <span className="session-item__preview">{session.preview || "No replies yet."}</span>
                      <div className="session-item__actions">
                        {movingSessionId === session.session_id ? (
                          <div className="session-move-inline" onClick={(e) => e.stopPropagation()}>
                            <select
                              className="session-move-select"
                              value={session.folder ?? ""}
                              onChange={(e) => {
                                void onMoveSession(session.session_id, e.target.value || null);
                                setMovingSessionId(null);
                              }}
                            >
                              <option value="">Ungrouped</option>
                              {allFolders.map((f) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                            <button
                              className="session-action-btn"
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setMovingSessionId(null); }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              className="session-action-btn"
                              type="button"
                              onClick={(event) => { event.stopPropagation(); requestRename(session); }}
                            >
                              Rename
                            </button>
                            <button
                              className="session-action-btn"
                              type="button"
                              onClick={(event) => { event.stopPropagation(); setMovingSessionId(session.session_id); }}
                            >
                              Move
                            </button>
                            <button
                              className="session-action-btn"
                              type="button"
                              onClick={(event) => { event.stopPropagation(); requestArchive(session); }}
                            >
                              Archive
                            </button>
                            <button
                              className="session-action-btn"
                              type="button"
                              onClick={(event) => { event.stopPropagation(); requestDelete(session); }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}

        {grouped.archived.length > 0 ? (
          <div className="session-group">
            <button 
              type="button" 
              className="session-folder-btn"
              onClick={() => toggleGroup("Archived")}
              aria-expanded={!collapsedGroups.has("Archived")}
            >
              Archived
              <ChevronIcon collapsed={collapsedGroups.has("Archived")} />
            </button>
            
            {!collapsedGroups.has("Archived") && (
              <div className="folder-content">
                {grouped.archived.map((group) =>
                  group.sessions.map((session) => (
                    <div
                      key={session.session_id}
                      className="session-item session-item--archived"
                      onClick={() => void onSelectSession(session.session_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void onSelectSession(session.session_id);
                        }
                      }}
                    >
                      <span className="session-item__title">{session.title}</span>
                      <span className="session-item__time">{group.label} · {formatSessionTime(session.touched_at)}</span>
                      <div className="session-item__actions">
                        <button
                          className="session-action-btn"
                          type="button"
                          onClick={(event) => { event.stopPropagation(); requestRestore(session); }}
                        >
                          Restore
                        </button>
                        <button
                          className="session-action-btn"
                          type="button"
                          onClick={(event) => { event.stopPropagation(); requestDelete(session); }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
