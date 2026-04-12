import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RequestLifecycle, ParsedLogEvent, InterventionEvent } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/humanize';

interface Props {
  request: RequestLifecycle;
  interventions: InterventionEvent[];
  onClose: () => void;
  onOpenGovernance: () => void;
}

interface Stage {
  category: string;
  label: string;
  color: string;
  events: ParsedLogEvent[];
}

function groupIntoStages(events: ParsedLogEvent[]): Stage[] {
  const stages: Stage[] = [];
  let current: Stage | null = null;
  for (const event of events) {
    if (!current || current.category !== event.category) {
      current = {
        category: event.category,
        label: CATEGORY_LABELS[event.category as keyof typeof CATEGORY_LABELS] || event.category,
        color: CATEGORY_COLORS[event.category as keyof typeof CATEGORY_COLORS] || '#64748b',
        events: [event],
      };
      stages.push(current);
    } else {
      current.events.push(event);
    }
  }
  return stages;
}

export function RequestTimeline({ request, interventions, onClose, onOpenGovernance }: Props) {
  // Collapsed stage view by default — expand individual stages to see events
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const stages = groupIntoStages(request.events);

  const toggleStage = (idx: number) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleEvent = (key: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const durationMs = request.durationMs;
  const startMs = request.startTime.getTime();

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-card flex flex-col"
      style={{ height: 'calc(100vh - 96px)' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{request.id} Timeline</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={11} />{(durationMs / 1000).toFixed(1)}s</span>
            <span>{request.eventCount} events</span>
            <span className="text-amber-400">{request.observations.length} risk signals</span>
            <span className="text-red-400">{request.predictions.length} compliance checks</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGovernance}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors text-accent text-xs font-medium cursor-pointer"
          >
            <ShieldCheck size={13} />
            Governance
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Pipeline bar */}
      <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
          {stages.map((stage, i) => (
            <div
              key={i}
              className="h-full transition-all cursor-pointer hover:opacity-100"
              style={{
                flex: stage.events.length,
                backgroundColor: stage.color,
                opacity: expandedStages.has(i) ? 1 : 0.6,
              }}
              onClick={() => toggleStage(i)}
              title={`${stage.label}: ${stage.events.length} events`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {stages.length} pipeline stages · click a stage to expand events · click any event to inspect metadata
        </p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {stages.map((stage, stageIdx) => {
          const isOpen = expandedStages.has(stageIdx);
          const stageStartOffset = request.events.indexOf(stage.events[0]);
          const firstEventMs = stage.events[0]?.timestamp.getTime() ?? startMs;
          const offsetPct = durationMs > 0 ? Math.round(((firstEventMs - startMs) / durationMs) * 100) : 0;

          return (
            <div key={stageIdx} className="border-b border-border/50 last:border-0">
              {/* Stage header — always visible */}
              <button
                onClick={() => toggleStage(stageIdx)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color, boxShadow: isOpen ? `0 0 6px ${stage.color}` : 'none' }}
                />
                <span className="text-xs font-medium flex-1" style={{ color: stage.color }}>
                  {stage.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {stage.events.length} event{stage.events.length !== 1 ? 's' : ''}
                  {' · '}+{offsetPct}%
                </span>
                {isOpen
                  ? <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
                  : <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
                }
              </button>

              {/* Individual events — only visible when expanded */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="relative px-4 pb-2">
                      {/* Vertical connector */}
                      <div
                        className="absolute left-[22px] top-0 bottom-2 w-px"
                        style={{ backgroundColor: `${stage.color}30` }}
                      />

                      {stage.events.map((event, evIdx) => {
                        const evKey = `${stageIdx}-${stageStartOffset + evIdx}`;
                        const isEvOpen = expandedEvents.has(evKey);
                        const hasMeta = Object.keys(event.meta).length > 0;

                        return (
                          <div key={evKey} className="relative pl-6 py-1.5 group">
                            {/* Dot */}
                            <div
                              className="absolute left-[6px] top-[10px] w-[9px] h-[9px] rounded-full border bg-background"
                              style={{ borderColor: stage.color }}
                            />

                            <div
                              onClick={() => hasMeta && toggleEvent(evKey)}
                              className={`rounded-lg px-2 py-1.5 ${hasMeta ? 'cursor-pointer hover:bg-white/[0.03]' : ''} transition-colors`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[11px] text-foreground/80 truncate">
                                    {event.humanLabel}
                                  </span>
                                  {hasMeta && (
                                    isEvOpen
                                      ? <ChevronDown size={10} className="text-muted-foreground flex-shrink-0" />
                                      : <ChevronRight size={10} className="text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                                  {event.timestamp.toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                  } as Intl.DateTimeFormatOptions)}
                                </span>
                              </div>

                              <AnimatePresence>
                                {isEvOpen && hasMeta && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-1.5 p-2 rounded bg-white/[0.03] border border-border/50">
                                      <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
                                        {JSON.stringify(event.meta, null, 2)}
                                      </pre>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
