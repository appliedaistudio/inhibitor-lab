"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import {
  MapPin,
  TrendingUp,
  Shield,
  Clock,
  Radio,
  Play,
  Pause,
  ChevronLeft,
} from "lucide-react";
import type { Incident } from "@/lib/api";
import {
  getNeighborhoodBySlug,
  incidentsInNeighborhood,
  type Neighborhood,
} from "@/lib/neighborhoods";
import {
  trendByDay,
  hourDistribution,
  areaVsCityComparison,
} from "@/lib/analytics";
import { assessSafety } from "@/lib/search";
import { getSeverity } from "@/lib/severity";
import Sparkline from "@/components/charts/Sparkline";
import DonutChart from "@/components/charts/DonutChart";
import HourClock from "@/components/charts/HourClock";
import { subscribeIncidents } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { enrichIncidents } from "@/lib/incident-weights";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Props {
  slug: string;
}

export default function NeighborhoodProfile({ slug }: Props) {
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const hood = getNeighborhoodBySlug(slug);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsub = subscribeIncidents(
      (next) => setAllIncidents(enrichIncidents(next)),
      (e) => console.error("Firestore:", e)
    );
    return unsub;
  }, []);

  if (!hood) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--map-bg, #0a0a0a)" }}>
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--panel-text, #fff)" }}>Neighborhood not found</h1>
          <a href="/" className="text-blue-500 hover:underline text-sm">Back to map</a>
        </div>
      </div>
    );
  }

  return <ProfileContent hood={hood} allIncidents={allIncidents} />;
}

function ProfileContent({
  hood,
  allIncidents,
}: {
  hood: Neighborhood;
  allIncidents: Incident[];
}) {
  const areaIncidents = useMemo(
    () => incidentsInNeighborhood(allIncidents, hood.slug),
    [allIncidents, hood.slug]
  );

  const safety = useMemo(
    () =>
      assessSafety(
        { display_name: hood.name, lat: hood.center.lat, lng: hood.center.lng },
        allIncidents,
        1.5
      ),
    [allIncidents, hood]
  );

  const safetyScores = useMemo(() => {
    const days = 30;
    const scores: number[] = [];
    const now = Date.now();
    for (let d = 0; d < days; d++) {
      const dayStart = now - (days - d) * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayIncs = areaIncidents.filter((i) => {
        const t = new Date(i.reported_at).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const score = Math.max(0, 100 - dayIncs.length * 15 - (dayIncs.reduce((s, i) => s + i.s_base, 0) / Math.max(dayIncs.length, 1)) * 30);
      scores.push(Math.round(Math.max(0, Math.min(100, score))));
    }
    return scores;
  }, [areaIncidents]);

  const trends = useMemo(() => trendByDay(areaIncidents, 30), [areaIncidents]);
  const hours = useMemo(() => hourDistribution(areaIncidents), [areaIncidents]);
  const comparison = useMemo(
    () => areaVsCityComparison(areaIncidents, allIncidents),
    [areaIncidents, allIncidents]
  );

  const donutSegments = useMemo(() => {
    const catMap: Record<string, { label: string; color: string; count: number }> = {};
    for (const t of trends) {
      const total = t.data.reduce((s, d) => s + d.count, 0);
      if (total > 0) catMap[t.label] = { label: t.label, color: t.color, count: total };
    }
    return Object.values(catMap).map((c) => ({
      label: c.label,
      value: c.count,
      color: c.color,
    }));
  }, [trends]);

  const peakHour = hours.indexOf(Math.max(...hours));
  const peakLabel = `${peakHour % 12 || 12}${peakHour < 12 ? "am" : "pm"}`;

  const notableIncidents = useMemo(
    () =>
      [...areaIncidents]
        .sort((a, b) => b.s_base * b.confidence - a.s_base * a.confidence)
        .slice(0, 5),
    [areaIncidents]
  );

  const currentScore = safetyScores[safetyScores.length - 1] ?? 100;
  const prevScore = safetyScores.length > 7 ? safetyScores[safetyScores.length - 8] : currentScore;
  const scoreDelta = currentScore - prevScore;

  const riskColor =
    currentScore >= 70 ? "#22c55e" : currentScore >= 40 ? "#f59e0b" : "#ef4444";
  const riskLabel =
    currentScore >= 70 ? "Low Risk" : currentScore >= 40 ? "Moderate Risk" : "High Risk";

  return (
    <div className="min-h-screen" style={{ background: "var(--map-bg, #0a0a0a)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--panel-text-secondary, #aaa)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div className="flex-1">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--panel-text, #fff)" }}
            >
              {hood.name}
            </h1>
            <p className="text-xs" style={{ color: "var(--panel-text-muted, #666)" }}>
              Neighborhood Safety Profile
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold font-mono" style={{ color: riskColor }}>
              {currentScore}
            </div>
            <div className="flex items-center gap-1">
              <span
                className="text-[9px] font-mono uppercase"
                style={{ color: riskColor }}
              >
                {riskLabel}
              </span>
              {scoreDelta !== 0 && (
                <span
                  className="text-[9px] font-mono"
                  style={{
                    color: scoreDelta > 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {scoreDelta > 0 ? "+" : ""}
                  {scoreDelta}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Safety Score Over Time */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--panel-bg, #111)",
            border: "1px solid var(--panel-border, #222)",
          }}
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
            style={{ color: "var(--panel-text-muted, #666)" }}
          >
            <TrendingUp className="w-3 h-3" />
            Safety Score — 30 Days
          </h3>
          <Sparkline
            data={safetyScores}
            color={riskColor}
            width={500}
            height={60}
            filled
            className="w-full"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--panel-bg, #111)",
              border: "1px solid var(--panel-border, #222)",
            }}
          >
            <h3
              className="text-[10px] font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--panel-text-muted, #666)" }}
            >
              Top Categories
            </h3>
            <div className="flex justify-center">
              <DonutChart segments={donutSegments} size={100} />
            </div>
            <div className="mt-3 space-y-1">
              {donutSegments.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[10px]">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span style={{ color: "var(--panel-text-secondary, #aaa)" }}>
                    {s.label}
                  </span>
                  <span
                    className="ml-auto font-mono"
                    style={{ color: "var(--panel-text-muted, #666)" }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--panel-bg, #111)",
              border: "1px solid var(--panel-border, #222)",
            }}
          >
            <h3
              className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
              style={{ color: "var(--panel-text-muted, #666)" }}
            >
              <Clock className="w-3 h-3" />
              Peak Hours
            </h3>
            <div className="flex justify-center">
              <HourClock data={hours} size={100} />
            </div>
            <p
              className="mt-3 text-center text-[11px]"
              style={{ color: "var(--panel-text-secondary, #aaa)" }}
            >
              Peak: <strong style={{ color: "var(--panel-text, #fff)" }}>{peakLabel}</strong>
              {" "}({hours[peakHour]} incidents)
            </p>
          </div>
        </div>

        {/* Area vs City */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--panel-bg, #111)",
            border: "1px solid var(--panel-border, #222)",
          }}
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--panel-text-muted, #666)" }}
          >
            {hood.name} vs City Average
          </h3>
          <div className="space-y-2">
            {comparison.map((cat) => {
              const diff = cat.areaRate - cat.cityRate;
              const isAbove = diff > 0.01;
              const isBelow = diff < -0.01;
              return (
                <div key={cat.label} className="flex items-center gap-3">
                  <span
                    className="text-[10px] w-14 shrink-0"
                    style={{ color: "var(--panel-text-secondary, #aaa)" }}
                  >
                    {cat.label}
                  </span>
                  <div
                    className="flex-1 h-3 rounded-full overflow-hidden"
                    style={{ background: "var(--panel-input-bg, #1a1a1a)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(5, cat.areaRate * 500))}%`,
                        backgroundColor: isAbove ? "#ef4444" : isBelow ? "#22c55e" : cat.color,
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-mono w-10 text-right"
                    style={{
                      color: isAbove ? "#ef4444" : isBelow ? "#22c55e" : "var(--panel-text-muted, #666)",
                    }}
                  >
                    {isAbove ? "+" : ""}
                    {Math.round(diff * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notable Incidents */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--panel-bg, #111)",
            border: "1px solid var(--panel-border, #222)",
          }}
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
            style={{ color: "var(--panel-text-muted, #666)" }}
          >
            <Shield className="w-3 h-3" />
            Recent Notable Incidents
          </h3>
          {notableIncidents.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--panel-text-muted, #666)" }}>
              No incidents recorded in this area
            </p>
          ) : (
            <div className="space-y-3">
              {notableIncidents.map((inc) => {
                const sev = getSeverity(inc.severity_category);
                return (
                  <NotableIncidentCard key={inc.id} inc={inc} sev={sev} />
                );
              })}
            </div>
          )}
        </div>

        <div
          className="text-center text-[10px] py-4"
          style={{ color: "var(--panel-text-muted, #666)" }}
        >
          PHLPulse · AI-Powered Community Safety · All data UNVERIFIED
        </div>
      </div>
    </div>
  );
}

function NotableIncidentCard({
  inc,
  sev,
}: {
  inc: Incident;
  sev: { label: string; markerColor: string };
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAudio = !!inc.audio_clip && !!API_BASE;

  const toggleAudio = () => {
    if (!hasAudio) return;
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

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "var(--panel-input-bg, #1a1a1a)" }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: sev.markerColor + "20",
            color: sev.markerColor,
          }}
        >
          {sev.label}
        </span>
        <span
          className="text-[10px] font-mono"
          style={{ color: "var(--panel-text-muted, #666)" }}
        >
          {new Date(inc.reported_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
        {hasAudio && (
          <button
            onClick={toggleAudio}
            className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all ${
              playing
                ? "bg-blue-500 text-white"
                : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
            }`}
          >
            {playing ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            {playing ? "Playing" : "Listen"}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 text-[11px] mb-1" style={{ color: "var(--panel-text-secondary, #aaa)" }}>
        <MapPin className="w-3 h-3 shrink-0" />
        {inc.location_text || "Unknown location"}
      </div>
      <p
        className="text-[11px] leading-snug italic"
        style={{ color: "var(--panel-text-secondary, #aaa)" }}
      >
        &ldquo;{inc.raw_text.length > 150 ? inc.raw_text.slice(0, 150) + "…" : inc.raw_text}&rdquo;
      </p>
    </div>
  );
}
