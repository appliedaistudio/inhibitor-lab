import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RequestLifecycle, ParsedLogEvent } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/humanize';

interface Props {
  requests: RequestLifecycle[];
}

export function TimelineReplay({ requests }: Props) {
  const [selectedReq, setSelectedReq] = useState<RequestLifecycle | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-select first request with observations
  useEffect(() => {
    const rich = requests.find(r => r.observations.length > 3 && r.predictions.length > 2);
    if (rich) setSelectedReq(rich);
    else if (requests[0]) setSelectedReq(requests[0]);
  }, [requests]);

  const events = selectedReq?.events || [];
  const totalSteps = events.length;

  // Playback
  useEffect(() => {
    if (!playing || currentStep >= totalSteps - 1) {
      setPlaying(false);
      return;
    }

    const currentEvent = events[currentStep];
    const nextEvent = events[currentStep + 1];
    const realDelay = nextEvent
      ? nextEvent.timestamp.getTime() - currentEvent.timestamp.getTime()
      : 500;

    // Scale delay: compress to 50-500ms range
    const scaledDelay = Math.max(50, Math.min(500, realDelay / speed));

    timerRef.current = setTimeout(() => {
      setCurrentStep(s => s + 1);
    }, scaledDelay);

    return () => clearTimeout(timerRef.current);
  }, [playing, currentStep, totalSteps, events, speed]);

  // Auto-scroll to current step
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-step="${currentStep}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  const reset = useCallback(() => {
    setPlaying(false);
    setCurrentStep(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (currentStep >= totalSteps - 1) setCurrentStep(0);
    setPlaying(p => !p);
  }, [currentStep, totalSteps]);

  // Stage progress
  const stagesReached = new Set(events.slice(0, currentStep + 1).map(e => e.category));
  const progressPct = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const currentEvent = events[currentStep];

  // Elapsed time
  const elapsed = currentEvent && events[0]
    ? currentEvent.timestamp.getTime() - events[0].timestamp.getTime()
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 flex items-center justify-center">
            <Play size={20} className="text-[#a855f7] ml-0.5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Incident Timeline Replay</h2>
            <p className="text-sm text-muted-foreground">
              Watch the Inhibitor process a request step by step
            </p>
          </div>
        </div>

        {/* Request selector */}
        <div className="relative">
          <select
            value={selectedReq?.id || ''}
            onChange={e => {
              const req = requests.find(r => r.id === e.target.value);
              if (req) { setSelectedReq(req); reset(); }
            }}
            className="appearance-none bg-[#0a0e1a] border border-border rounded-lg px-3 py-2 pr-8 text-xs text-foreground focus:outline-none focus:border-[#a855f7]/40"
          >
            {requests.map(r => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.eventCount} events, {r.observations.length} risks
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </motion.div>

      {/* Player controls + progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5"
      >
        {/* Stage progress bar */}
        <div className="flex gap-1 mb-4">
          {events.map((event, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-200 cursor-pointer"
              onClick={() => { setPlaying(false); setCurrentStep(i); }}
              style={{
                backgroundColor: i <= currentStep
                  ? CATEGORY_COLORS[event.category]
                  : `${CATEGORY_COLORS[event.category]}20`,
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={reset} className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw size={16} />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-xl bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/25 hover:bg-[#a855f7]/25 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
            >
              {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              onClick={() => setSpeed(s => s >= 8 ? 1 : s * 2)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
            >
              <FastForward size={12} />
              {speed}x
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">Step {currentStep + 1}/{totalSteps}</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {(elapsed / 1000).toFixed(1)}s elapsed
            </span>
            <span className="font-mono">{progressPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Current event highlight */}
        {currentEvent && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-4 p-4 rounded-xl border"
            style={{
              borderColor: `${CATEGORY_COLORS[currentEvent.category]}30`,
              background: `${CATEGORY_COLORS[currentEvent.category]}08`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: CATEGORY_COLORS[currentEvent.category],
                  boxShadow: `0 0 10px ${CATEGORY_COLORS[currentEvent.category]}80`,
                }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: CATEGORY_COLORS[currentEvent.category] }}>
                  {currentEvent.humanLabel}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {CATEGORY_LABELS[currentEvent.category]}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {currentEvent.timestamp.toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </span>
            </div>
            {Object.keys(currentEvent.meta).length > 0 && !('raw' in currentEvent.meta) && (
              <pre className="mt-2 text-[10px] text-muted-foreground font-mono bg-black/20 p-2 rounded-lg overflow-x-auto">
                {JSON.stringify(currentEvent.meta, null, 2)}
              </pre>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Event timeline scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 max-h-64 overflow-y-auto"
        ref={scrollRef}
      >
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
          {events.map((event, i) => {
            const isPast = i <= currentStep;
            const isCurrent = i === currentStep;
            return (
              <div
                key={i}
                data-step={i}
                onClick={() => { setPlaying(false); setCurrentStep(i); }}
                className={`relative py-1.5 cursor-pointer transition-opacity ${isPast ? 'opacity-100' : 'opacity-30'}`}
              >
                <div
                  className="absolute left-[-19px] top-2.5 w-2 h-2 rounded-full border-2 bg-background"
                  style={{
                    borderColor: isPast ? CATEGORY_COLORS[event.category] : '#141c2e',
                    boxShadow: isCurrent ? `0 0 8px ${CATEGORY_COLORS[event.category]}` : 'none',
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isCurrent ? 'font-semibold' : ''}`} style={{ color: isPast ? CATEGORY_COLORS[event.category] : '#4a5568' }}>
                    {event.humanLabel}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/60">
                    +{((event.timestamp.getTime() - events[0].timestamp.getTime()) / 1000).toFixed(2)}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
