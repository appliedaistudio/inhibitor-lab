"use client";

import { useState, useRef, useMemo } from "react";
import type { Incident } from "@/lib/api";
import { getSeverity } from "@/lib/severity";
import {
  AlertTriangle,
  Flame,
  Car,
  Heart,
  ShieldAlert,
  Volume2,
  CircleDot,
  MapPin,
  ChevronDown,
  Play,
  Pause,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  violent_weapon: <ShieldAlert className="w-3.5 h-3.5" />,
  violent_no_weapon: <ShieldAlert className="w-3.5 h-3.5" />,
  shots_heard: <Volume2 className="w-3.5 h-3.5" />,
  robbery: <AlertTriangle className="w-3.5 h-3.5" />,
  burglary_in_progress: <AlertTriangle className="w-3.5 h-3.5" />,
  medical_priority: <Heart className="w-3.5 h-3.5" />,
  medical_other: <Heart className="w-3.5 h-3.5" />,
  fire_hazmat: <Flame className="w-3.5 h-3.5" />,
  traffic_crash_injury: <Car className="w-3.5 h-3.5" />,
  traffic_crash_no_injury: <Car className="w-3.5 h-3.5" />,
  disorder: <CircleDot className="w-3.5 h-3.5" />,
};

interface TimeBlock {
  label: string;
  incidents: Incident[];
}

function groupByTimeBlocks(incidents: Incident[]): TimeBlock[] {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const blocks: TimeBlock[] = [
    { label: "Last Hour", incidents: [] },
    { label: "Last 3 Hours", incidents: [] },
    { label: "Today", incidents: [] },
    { label: "Yesterday", incidents: [] },
    { label: "This Week", incidents: [] },
    { label: "Older", incidents: [] },
  ];

  for (const inc of incidents) {
    const t = new Date(inc.reported_at).getTime();
    if (t >= hourAgo) blocks[0].incidents.push(inc);
    else if (t >= threeHoursAgo) blocks[1].incidents.push(inc);
    else if (t >= todayStart.getTime()) blocks[2].incidents.push(inc);
    else if (t >= yesterdayStart.getTime()) blocks[3].incidents.push(inc);
    else if (t >= weekStart.getTime()) blocks[4].incidents.push(inc);
    else blocks[5].incidents.push(inc);
  }

  for (const block of blocks) {
    block.incidents.sort((a, b) => b.s_base - a.s_base);
  }

  return blocks.filter((b) => b.incidents.length > 0);
}

interface Props {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function IncidentCard({
  inc,
  isSelected,
  onSelect,
}: {
  inc: Incident;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const sev = getSeverity(inc.severity_category);
  const isHighSev = inc.s_base >= 0.7;
  const confidencePct = Math.round(inc.confidence * 100);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const confColor =
    confidencePct >= 70 ? "#22c55e" : confidencePct >= 40 ? "#f59e0b" : "#ef4444";

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inc.audio_clip || !API_BASE) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(`${API_BASE}/api/audio/${inc.audio_clip}`);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      audioRef.current.addEventListener("error", () => setPlaying(false));
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const snippet = inc.description
    ? inc.description
    : inc.location_text
      ? `${sev.label} reported at ${inc.location_text}`
      : null;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer
        ${isSelected ? "bg-white/10 ring-1 ring-white/10" : "hover:bg-white/5"}`}
      style={{ opacity: confidencePct < 40 ? 0.6 : 1 }}
    >
      <div
        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-opacity"
        style={{ backgroundColor: sev.markerColor, opacity: isSelected ? 1 : 0.4 }}
      />

      <div
        className="mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: sev.markerColor + "18", color: sev.markerColor }}
      >
        {CATEGORY_ICONS[inc.severity_category] || <CircleDot className="w-3.5 h-3.5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: sev.markerColor }}
          >
            {sev.label}
          </span>
          {isHighSev && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
        </div>

        <div className="flex items-center gap-1 text-xs truncate" style={{ color: "var(--panel-text, rgba(255,255,255,0.7))" }}>
          <MapPin className="w-3 h-3 shrink-0" style={{ color: "var(--panel-text-muted, rgba(255,255,255,0.3))" }} />
          <span className="truncate">{inc.location_text || "Unknown"}</span>
        </div>

        {snippet && (
          <p
            className="mt-1 text-[11px] leading-snug italic line-clamp-2"
            style={{ color: "var(--panel-text-secondary, rgba(255,255,255,0.5))" }}
          >
            &ldquo;{snippet}&rdquo;
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          {inc.audio_clip && API_BASE && (
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all ${
                playing
                  ? "bg-blue-500 text-white"
                  : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
              }`}
            >
              {playing ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              {playing ? "Playing" : "Listen"}
            </button>
          )}

          {inc.lat != null && inc.lng != null && (
            <div
              className="w-12 h-8 rounded border overflow-hidden shrink-0"
              style={{ borderColor: "var(--panel-border, rgba(255,255,255,0.1))" }}
            >
              <div
                className="w-full h-full relative"
                style={{ background: "var(--panel-input-bg, rgba(255,255,255,0.05))" }}
              >
                <div
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: sev.markerColor,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    boxShadow: `0 0 4px ${sev.markerColor}`,
                  }}
                />
              </div>
            </div>
          )}

          <div
            className="h-1 flex-1 rounded-full overflow-hidden"
            style={{ background: "var(--panel-input-bg, rgba(255,255,255,0.05))" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${confidencePct}%`, backgroundColor: confColor }}
            />
          </div>
          <span className="text-[9px] font-mono shrink-0" style={{ color: confColor }}>
            {confidencePct}%
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-[10px] font-mono" style={{ color: "var(--panel-text-muted, rgba(255,255,255,0.3))" }}>
          {timeAgo(inc.reported_at)}
        </span>
      </div>
    </div>
  );
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function IncidentFeed({ incidents, selectedId, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const blocks = useMemo(() => groupByTimeBlocks(incidents), [incidents]);

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--panel-input-bg, rgba(255,255,255,0.05))" }}>
          <RadioIcon className="w-5 h-5" style={{ color: "var(--panel-text-muted, rgba(255,255,255,0.3))" }} />
        </div>
        <p className="text-xs font-mono" style={{ color: "var(--panel-text-muted, rgba(255,255,255,0.3))" }}>AWAITING INCIDENTS</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {blocks.map((block) => {
        const isCollapsed = collapsed[block.label] ?? false;
        return (
          <div key={block.label}>
            <button
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [block.label]: !isCollapsed }))
              }
              className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
              style={{ color: "var(--panel-text-secondary, rgba(255,255,255,0.6))" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-hover, rgba(255,255,255,0.03))")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider flex-1">
                {block.label}
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--panel-input-bg, rgba(255,255,255,0.05))" }}
              >
                {block.incidents.length}
              </span>
            </button>
            {!isCollapsed &&
              block.incidents.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  inc={inc}
                  isSelected={inc.id === selectedId}
                  onSelect={() => onSelect(inc.id)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function RadioIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
