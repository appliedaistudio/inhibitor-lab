"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import { Composer } from "./chat/composer";
import { ModeTabs } from "./chat/mode-tabs";
import { ChatThread } from "./chat/chat-thread";
import { ResourcesRail } from "./chat/resources-rail";
import { DialogProvider } from "./ui/dialog";
import { shouldAppendResponseToVisibleThread } from "./chat/session-response-ownership";
import { SessionSidebar } from "./chat/session-sidebar";
import { toChatThreadMessages } from "./chat/session-workspace-presenters";
import { DecksView } from "./retention/decks-view";
import { SettingsButton } from "./settings-button";
import { UserProfile } from "./user-profile";
import type { ChatThreadMessage } from "./chat/chat-thread";
import type {
  AttachmentReference,
  CompanionMode,
  CompanionPipelineResult,
  EvaluationHarnessResult,
  SessionWorkspaceDetail,
  SessionWorkspaceEntry,
  SessionWorkspaceList
} from "../types/companion";

// ─── Types ─────────────────────────────────────────────────────────────────

interface HealthStatus {
  ok: boolean;
  has_openai_key: boolean;
  has_inhibitor_key: boolean;
  has_opencode_server: boolean;
  primary_model: string;
  verifier_model: string;
  opencode_server_url: string | null;
}

type ChatMessage = ChatThreadMessage;
type WorkspaceView = "assistant" | "retention";

// ─── Constants ─────────────────────────────────────────────────────────────

const promptPresets = {
  research: [
    "Compare the risks of claiming a research idea is completely novel when I only have two related sources.",
    "Summarize this direction with citations and tell me what overlap to check before emailing a professor."
  ],
  learning: [
    "I think Newton's second law means acceleration always rises if force and mass both rise. Is that right?",
    "I got the right answer so my reasoning must be correct — check if I really understand the concept."
  ],
  retention: []
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

async function fetchSessionWorkspace(): Promise<SessionWorkspaceList> {
  const response = await fetch("/api/sessions");
  const payload = (await response.json()) as SessionWorkspaceList | { error?: string };
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Failed to load session workspace."
    );
  }

  return payload as SessionWorkspaceList;
}

async function fetchSessionDetail(nextSessionId: string): Promise<SessionWorkspaceDetail> {
  const response = await fetch(`/api/sessions/${nextSessionId}`);
  const payload = (await response.json()) as SessionWorkspaceDetail | { error?: string };
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Failed to load session detail."
    );
  }

  return payload as SessionWorkspaceDetail;
}

async function createSessionWorkspaceEntry(input: {
  mode: CompanionMode;
  title?: string;
  folder?: string | null;
}): Promise<SessionWorkspaceEntry> {
  return fetchJson<SessionWorkspaceEntry>("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

async function updateSessionWorkspaceEntry(
  sessionId: string,
  input: {
    title?: string;
    folder?: string | null;
    archived?: boolean;
  }
): Promise<SessionWorkspaceEntry> {
  return fetchJson<SessionWorkspaceEntry>(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

async function archiveSessionWorkspaceEntry(sessionId: string): Promise<void> {
  await fetchJson(`/api/sessions/${sessionId}?archive=1`, {
    method: "DELETE"
  });
}

async function deleteSessionWorkspaceEntry(sessionId: string): Promise<void> {
  await fetchJson(`/api/sessions/${sessionId}`, {
    method: "DELETE"
  });
}

function createAttachmentReference(file: File, index: number): AttachmentReference {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2, 8);

  return {
    id: `attachment-${Date.now()}-${index}-${randomPart}`,
    name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size
  };
}

export function findRegenerateSourceMessage(
  messages: ChatMessage[],
  assistantMessageId: string
): ChatMessage | null {
  const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
  if (assistantIndex < 0) {
    return null;
  }

  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user") {
      return message;
    }
  }

  return null;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <span className={`debug-chevron ${open ? "open" : ""}`}>▼</span>
  );
}

function DebugSection({
  title,
  children,
  defaultOpen = false
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="debug-section">
      <button
        className="debug-section-toggle"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
      >
        {title}
        <ChevronIcon open={open} />
      </button>
      {open && <div className="debug-section-body">{children}</div>}
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  return <span className={`badge ${decision}`}>{decision.replace(/_/g, " ")}</span>;
}

function VerdictBadge({ verdict }: { verdict: string }) {
  return <span className={`verdict ${verdict}`}>{verdict}</span>;
}

function DebugPanelContent({ result }: { result: CompanionPipelineResult }) {
  return (
    <>
      {/* Inhibitor */}
      <DebugSection title="Inhibitor" defaultOpen>
        <div className="inhibitor-info">
          <span className={`badge ${result.inhibitor.blocked ? "block_action" : "allow"}`}>
            {result.inhibitor.blocked ? "blocked" : "pass"}
          </span>
          {result.inhibitor.reasons.length > 0 && (
            <ul className="inhibitor-reasons">
              {result.inhibitor.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      </DebugSection>

      {/* Evidence */}
      <DebugSection title={`Evidence (${result.evidence.length})`} defaultOpen>
        {result.evidence.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ink-soft)" }}>No evidence retrieved.</p>
        ) : (
          result.evidence.map((item) => (
            <div className="debug-evidence-card" key={item.id}>
              <span className={`source-type-badge ${item.source_type}`}>{item.source_type.replace(/_/g, " ")}</span>
              <p className="debug-evidence-title">[{item.id}] {item.title}</p>
              <p className="debug-evidence-snippet">{item.snippet}</p>
            </div>
          ))
        )}
      </DebugSection>

      {/* Verifiers */}
      <DebugSection title={`Verifiers (${result.judgments.length})`} defaultOpen>
        <div className="verifier-mini-grid">
          {result.judgments.map((j) => (
            <div className="verifier-mini-card" key={j.verifier_name}>
              <VerdictBadge verdict={j.verdict} />
              <p className="verifier-mini-name">{j.verifier_name.replace(/_/g, " ")}</p>
              <p className="verifier-mini-risk">risk {j.risk_score.toFixed(2)}</p>
              <p className="verifier-mini-rationale">{j.rationale}</p>
            </div>
          ))}
        </div>
      </DebugSection>

      {/* Orchestrator */}
      <DebugSection title="Orchestrator" defaultOpen>
        <div className="orchestrator-info">
          <DecisionBadge decision={result.decision.decision} />
          {result.decision.blocking_reasons.length > 0 && (
            <>
              <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Blocking</p>
              <ul className="orchestrator-reasons">
                {result.decision.blocking_reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
          {result.decision.revision_notes.length > 0 && (
            <>
              <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Revision notes</p>
              <ul className="orchestrator-reasons">
                {result.decision.revision_notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </DebugSection>

      {/* Runtime */}
      {result.runtime && (
        <DebugSection title="Runtime">
          <div className="runtime-rows">
            <div className="runtime-row">
              <span className="runtime-key">backend</span>
              <span className="runtime-val">{result.runtime.backend}</span>
            </div>
            <div className="runtime-row">
              <span className="runtime-key">agent</span>
              <span className="runtime-val">{result.runtime.agent}</span>
            </div>
            <div className="runtime-row">
              <span className="runtime-key">session</span>
              <span className="runtime-val">{result.runtime.session_id}</span>
            </div>
            <div className="runtime-row">
              <span className="runtime-key">degraded</span>
              <span className="runtime-val">{String(result.runtime.degraded)}</span>
              {result.runtime.degraded && (
                <span className="badge revise" style={{ marginLeft: 4, padding: "2px 6px", fontSize: "0.66rem" }}>degraded</span>
              )}
            </div>
          </div>
        </DebugSection>
      )}

      {/* Process events */}
      <DebugSection title={`Process Events (${result.process_events.length})`}>
        {result.process_events.map((event) => (
          <div className="audit-entry" key={`${event.stage}-${event.created_at}`}>
            <p className="audit-stage">{event.title}</p>
            <p className="audit-time">{event.created_at}</p>
            <p className="audit-payload">{event.participant} · {event.stage}</p>
            <p className="audit-payload">{event.body}</p>
          </div>
        ))}
      </DebugSection>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompanionApp() {
  const [mode, setMode] = useState<CompanionMode>("research");
  const [workspace, setWorkspace] = useState<WorkspaceView>("assistant");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionWorkspaceEntry[]>([]);
  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentReference[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [harnessScore, setHarnessScore] = useState<{ matched: number; total: number } | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const activeSessionIdRef = useRef<string | null>(activeSessionId);

  // Health check on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthStatus | null) => { if (data) setHealth(data); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void initializeAssistantWorkspace();
  }, []);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, pending]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  function handleModeChange(nextMode: CompanionMode) {
    setMode(nextMode);
  }

  function handleWorkspaceChange(nextWorkspace: WorkspaceView) {
    setWorkspace(nextWorkspace);
  }

  function updateActiveSessionId(nextSessionId: string | null) {
    activeSessionIdRef.current = nextSessionId;
    setActiveSessionId(nextSessionId);
  }

  function resetThread(nextSessionId: string | null) {
    updateActiveSessionId(nextSessionId);
    setMessages([]);
    setError(null);
    setDebugOpen(false);
    setInputText("");
    setPendingAttachments([]);
  }

  async function refreshSessionIndex(preferredSessionId?: string | null): Promise<SessionWorkspaceList> {
    const workspaceState = await fetchSessionWorkspace();
    setSessions(workspaceState.sessions);

    const availableSessionIds = new Set(
      workspaceState.sessions.filter((session) => session.archived_at === null).map((session) => session.session_id)
    );

    if (preferredSessionId && !availableSessionIds.has(preferredSessionId)) {
      const fallback = workspaceState.sessions.find((session) => session.archived_at === null) ?? null;
      updateActiveSessionId(fallback?.session_id ?? null);
    }

    return workspaceState;
  }

  async function loadSessionThread(nextSessionId: string) {
    setSessionBusy(true);

    try {
      const detail = await fetchSessionDetail(nextSessionId);
      updateActiveSessionId(detail.session.session_id);
      setMode(detail.session.mode);
      setMessages(toChatThreadMessages(detail.thread));
      setError(null);
      setDebugOpen(false);
      setInputText("");
      setPendingAttachments([]);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to load session.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function initializeAssistantWorkspace() {
    setSessionBusy(true);

    try {
      const workspaceState = await fetchSessionWorkspace();
      let activeSession = workspaceState.sessions.find((session) => session.archived_at === null) ?? null;

      if (!activeSession) {
        activeSession = await createSessionWorkspaceEntry({ mode });
        setSessions([activeSession]);
        resetThread(activeSession.session_id);
      } else {
        setSessions(workspaceState.sessions);
      }

      await loadSessionThread(activeSession.session_id);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to initialize session workspace.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleSelectSession(nextSessionId: string) {
    await loadSessionThread(nextSessionId);
  }

  async function handleStartNewThread(folder: string | null = null) {
    setSessionBusy(true);

    try {
      const created = await createSessionWorkspaceEntry({ mode, folder });
      setSessions((current) => [created, ...current.filter((session) => session.session_id !== created.session_id)]);
      resetThread(created.session_id);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to create a new thread.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleRenameSession(sessionId: string, title: string) {
    setSessionBusy(true);
    try {
      await updateSessionWorkspaceEntry(sessionId, { title });
      await refreshSessionIndex(sessionId);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to rename session.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleMoveSession(sessionId: string, folder: string | null) {
    setSessionBusy(true);
    try {
      await updateSessionWorkspaceEntry(sessionId, { folder });
      await refreshSessionIndex(sessionId);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to move session.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleArchiveSession(sessionId: string) {
    setSessionBusy(true);
    try {
      await archiveSessionWorkspaceEntry(sessionId);
      const workspaceState = await refreshSessionIndex(sessionId);
      if (activeSessionId === sessionId) {
        const fallback = workspaceState.sessions.find((session) => session.archived_at === null) ?? null;
        if (fallback) {
          await loadSessionThread(fallback.session_id);
        } else {
          resetThread(null);
        }
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to archive session.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleRestoreSession(sessionId: string) {
    setSessionBusy(true);
    try {
      await updateSessionWorkspaceEntry(sessionId, { archived: false });
      await refreshSessionIndex(sessionId);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to restore session.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    setSessionBusy(true);
    try {
      await deleteSessionWorkspaceEntry(sessionId);
      const workspaceState = await refreshSessionIndex(sessionId);
      if (activeSessionId === sessionId) {
        const fallback = workspaceState.sessions.find((session) => session.archived_at === null) ?? null;
        if (fallback) {
          await loadSessionThread(fallback.session_id);
        } else {
          resetThread(null);
        }
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Failed to delete session.");
    } finally {
      setSessionBusy(false);
    }
  }

  function applyPreset(text: string) {
    setInputText(text);
  }

  function getLatestAssistantResult(threadMessages: ChatMessage[]): CompanionPipelineResult | null {
    for (let index = threadMessages.length - 1; index >= 0; index -= 1) {
      const message = threadMessages[index];
      if (message.role === "assistant" && message.result) {
        return message.result;
      }
    }

    return null;
  }

  function handlePickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length === 0) {
      return;
    }

    setPendingAttachments((current) => [
      ...current,
      ...files.map((file, index) => createAttachmentReference(file, index))
    ]);
    event.currentTarget.value = "";
  }

  function handleRemoveAttachment(attachmentId: string) {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  function handleRegenerate(messageId: string) {
    const sourceMessage = findRegenerateSourceMessage(messages, messageId);
    if (!sourceMessage) {
      return;
    }

    void submitMessage(sourceMessage.content, sourceMessage.attachments ?? [], false);
  }

  // Background harness run after each assistant response
  const runHarnessBackground = useCallback(async () => {
    try {
      const res = await fetch("/api/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!res.ok) return;
      const payload = (await res.json()) as EvaluationHarnessResult;
      startTransition(() => {
        setHarnessScore({
          matched: payload.summary.expectation_matches,
          total: payload.summary.total_scenarios
        });
      });
    } catch {
      // silent
    }
  }, []);

  async function submitMessage(
    nextText = inputText,
    nextAttachments = pendingAttachments,
    resetComposer = true
  ) {
    const text = nextText.trim();
    if (!text || pending) return;
    if (!activeSessionId) {
      setError("No active session is available.");
      return;
    }

    const requestSessionId = activeSessionId;
    const requestMode = mode;
    const requestAttachments = nextAttachments;
    const requestShowProcess = debugOpen;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      attachments: requestAttachments,
      timestamp: new Date()
    };

    startTransition(() => {
      setMessages((prev) => [...prev, userMsg]);
      if (resetComposer) {
        setInputText("");
      }
      setError(null);
    });

    setPending(true);

    const requestOwnsVisibleThread = () =>
      shouldAppendResponseToVisibleThread({
        activeSessionId: activeSessionIdRef.current,
        requestSessionId
      });

    try {

      const response = await fetch("/api/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: requestSessionId,
          mode: requestMode,
          user_message: text,
          attachments: requestAttachments,
          show_process: requestShowProcess
        })
      });

      if (!response.ok) {
        throw new Error("Companion request failed.");
      }

      const payload = (await response.json()) as CompanionPipelineResult;

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: payload.synthesis.final_answer,
        result: payload,
        timestamp: new Date()
      };

      startTransition(() => {
        if (requestOwnsVisibleThread()) {
          setMessages((prev) => [...prev, assistantMsg]);
        }
        if (resetComposer && requestOwnsVisibleThread()) {
          setPendingAttachments([]);
        }
      });

      await refreshSessionIndex(requestSessionId);

      // Run harness silently in background
      void runHarnessBackground();
    } catch (requestError) {
      if (requestOwnsVisibleThread()) {
        setError(requestError instanceof Error ? requestError.message : "Unknown error");
      }
    } finally {
      setPending(false);
    }
  }

  const activeResult = getLatestAssistantResult(messages);
  const activeSessionThread = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    attachments: message.attachments,
    result: message.result,
    timestamp: message.timestamp.toISOString()
  }));

  return (
    <div className="app-shell app-shell--editorial">
      {/* ── Sidebar ── */}
      <aside className={`sidebar sidebar--editorial${sidebarCollapsed ? " sidebar--collapsed" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="sidebar-logo-name">VERITAS</div>
            <button
              className="sidebar-collapse-btn"
              type="button"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sidebarCollapsed
                  ? <><polyline points="9 18 15 12 9 6" /></>
                  : <><polyline points="15 18 9 12 15 6" /></>}
              </svg>
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="workspace-nav">
                <button
                  className={`workspace-nav__button ${workspace === "assistant" ? "active" : ""}`}
                  onClick={() => handleWorkspaceChange("assistant")}
                  type="button"
                >
                  Assistant
                </button>
                <button
                  className={`workspace-nav__button ${workspace === "retention" ? "active" : ""}`}
                  onClick={() => handleWorkspaceChange("retention")}
                  type="button"
                >
                  Retention
                </button>
              </div>

              {workspace === "assistant" ? <ModeTabs mode={mode} onChangeMode={handleModeChange} /> : null}
            </>
          )}
        </div>

        {!sidebarCollapsed && workspace === "assistant" ? (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            busy={sessionBusy}
            onSelectSession={(sessionId) => void handleSelectSession(sessionId)}
            onStartNew={(folder) => void handleStartNewThread(folder)}
            onRenameSession={(sessionId, title) => void handleRenameSession(sessionId, title)}
            onMoveSession={(sessionId, folder) => void handleMoveSession(sessionId, folder)}
            onArchiveSession={(sessionId) => void handleArchiveSession(sessionId)}
            onRestoreSession={(sessionId) => void handleRestoreSession(sessionId)}
            onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
          />
        ) : null}

        <div className="sidebar-bottom">
          <UserProfile collapsed={sidebarCollapsed} />
          <SettingsButton className="sidebar-settings-btn" />
        </div>
      </aside>

      {/* ── Chat main ── */}
      <main className="chat-main chat-main--editorial">
        {workspace === "assistant" ? (
          <div className="chat-layout">
            <section className="chat-primary">
              <div className={`chat-thread-frame ${debugOpen ? "chat-thread-frame--process-open" : ""}`}>
                <ChatThread
                  ref={threadRef}
                  messages={messages}
                  activeResult={activeResult}
                  showProcess={debugOpen}
                  onToggleProcess={() => setDebugOpen((value) => !value)}
                  onRegenerate={handleRegenerate}
                  pending={pending}
                />
              </div>

              <div className="chat-input-area chat-input-area--editorial">
                <div className="preset-chips">
                  {promptPresets[mode].map((preset) => (
                    <button
                      className="preset-chip"
                      key={preset}
                      onClick={() => applyPreset(preset)}
                      type="button"
                      title={preset}
                    >
                      {preset.length > 52 ? `${preset.slice(0, 52)}…` : preset}
                    </button>
                  ))}
                </div>

                <Composer
                  mode={mode}
                  pendingAttachments={pendingAttachments}
                  value={inputText}
                  onChange={setInputText}
                  onPickFiles={handlePickFiles}
                  onRemoveAttachment={handleRemoveAttachment}
                  onSubmit={() => void submitMessage()}
                />

                {error && <div className="chat-error">{error}</div>}
              </div>
            </section>

            <div className={`resources-rail-shell${railCollapsed ? " resources-rail-shell--collapsed" : ""}`}>
              <ResourcesRail
                thread={activeSessionThread}
                mode={mode}
                collapsed={railCollapsed}
                onToggleCollapse={() => setRailCollapsed((v) => !v)}
              />
            </div>
          </div>
        ) : (
          <DecksView />
        )}
      </main>

      <DialogProvider />
    </div>
  );
}
