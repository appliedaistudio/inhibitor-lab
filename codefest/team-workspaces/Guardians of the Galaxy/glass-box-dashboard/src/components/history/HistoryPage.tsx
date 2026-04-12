import { useState, useEffect } from 'react';
import { History, Trash2, Clock, Activity, ShieldAlert, Eye, Loader2, ExternalLink } from 'lucide-react';
import { getSavedSessions, deleteSession, clearAllSessions, type SessionRecord } from '@/lib/sessionStorage';

interface Props {
  onLoadSession?: (session: SessionRecord) => void;
  loading?: boolean;
  error?: string | null;
}

export function HistoryPage({ onLoadSession, loading, error }: Props) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Reset loadingId when loading completes
  useEffect(() => {
    if (!loading) setLoadingId(null);
  }, [loading]);

  useEffect(() => {
    setSessions(getSavedSessions());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getSavedSessions());
  };

  const handleClearAll = () => {
    clearAllSessions();
    setSessions([]);
  };

  const handleLoad = (session: SessionRecord) => {
    if (!onLoadSession || loading || loadingId) return;
    setLoadingId(session.id);
    onLoadSession(session);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 flex items-center justify-center">
            <History size={20} className="text-[#a855f7]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Audit History</h2>
            <p className="text-sm text-muted-foreground">
              {sessions.length} saved session{sessions.length !== 1 ? 's' : ''} — click to open full analysis
            </p>
          </div>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-danger border border-border hover:border-danger/30 transition-colors"
          >
            <Trash2 size={12} />
            Clear All
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 text-sm text-[#ff3b5c]">
          {error}
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="glass-card p-16 text-center">
          <History size={40} className="text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-muted-foreground mb-1">No Audit Sessions Yet</h3>
          <p className="text-xs text-muted-foreground/60">
            Sessions are saved automatically when you load datasets. Use "New Session" to start one.
          </p>
        </div>
      )}

      {/* Session cards */}
      <div className="space-y-3">
        {sessions.map((session) => {
          const isLoading = loadingId === session.id;
          return (
            <div
              key={session.id}
              onClick={() => handleLoad(session)}
              className={`glass-card p-5 transition-all duration-300 group ${
                onLoadSession ? 'cursor-pointer hover:border-[rgba(0,212,255,0.2)] hover:shadow-[0_0_20px_rgba(0,212,255,0.06)]' : ''
              } ${isLoading ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Title + date */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-foreground truncate">{session.name}</h3>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                      <Clock size={10} />
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5">
                      <Activity size={12} className="text-[#00d4ff]" />
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{session.totalRequests}</span> requests
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye size={12} className="text-[#ffb547]" />
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{session.totalEvents.toLocaleString()}</span> events
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert size={12} className="text-[#ff3b5c]" />
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{session.totalInterventions}</span> interventions
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pass rate: <span className="text-[#00e5a0] font-medium">{(session.passRate * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Time range */}
                  <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">
                    {new Date(session.timeStart).toLocaleDateString()} — {new Date(session.timeEnd).toLocaleDateString()}
                  </p>

                  {/* Top risks */}
                  {session.topRisks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {session.topRisks.slice(0, 4).map(risk => (
                        <span key={risk} className="px-2 py-0.5 rounded-full text-[9px] bg-[#ffb547]/10 text-[#ffb547] border border-[#ffb547]/15">
                          {risk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {/* Loading spinner */}
                  {isLoading && (
                    <Loader2 size={16} className="text-accent animate-spin" />
                  )}

                  {/* Open button */}
                  {onLoadSession && !isLoading && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLoad(session); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
                    >
                      <ExternalLink size={12} />
                      Open
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
