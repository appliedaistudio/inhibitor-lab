"use client";

import { X, Shield, AlertTriangle, Flame, HeartPulse, Car, Siren } from "lucide-react";
import type { Incident } from "@/lib/api";
import type { Neighborhood } from "@/lib/neighborhoods";

const CATEGORY_META: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  violent: { icon: Siren, color: "#ef4444", label: "Violent" },
  fire: { icon: Flame, color: "#f97316", label: "Fire / Hazmat" },
  medical: { icon: HeartPulse, color: "#3b82f6", label: "Medical" },
  traffic: { icon: Car, color: "#f59e0b", label: "Traffic" },
  disorder: { icon: AlertTriangle, color: "#a855f7", label: "Disorder" },
};

function categoryBreakdown(incidents: Incident[]) {
  const counts: Record<string, number> = {};
  for (const inc of incidents) {
    const cat = (inc.severity_category || "other").toLowerCase().split("(")[0].trim();
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function threatLevel(count: number): { label: string; color: string } {
  if (count === 0) return { label: "CLEAR", color: "#22c55e" };
  if (count <= 2) return { label: "LOW", color: "#22c55e" };
  if (count <= 5) return { label: "MODERATE", color: "#f59e0b" };
  if (count <= 10) return { label: "ELEVATED", color: "#f97316" };
  return { label: "HIGH", color: "#ef4444" };
}

interface Props {
  neighborhood: Neighborhood;
  incidents: Incident[];
  color: string;
  onClose: () => void;
}

export default function DistrictCard({ neighborhood, incidents, color, onClose }: Props) {
  const breakdown = categoryBreakdown(incidents);
  const threat = threatLevel(incidents.length);
  const criticalCount = incidents.filter((i) => i.w_eff >= 0.7).length;
  const maxCategory = breakdown[0];

  const recentIncident = incidents.length > 0
    ? [...incidents].sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime())[0]
    : null;

  const timeSinceRecent = recentIncident
    ? Math.round((Date.now() - new Date(recentIncident.reported_at).getTime()) / 60000)
    : null;

  return (
    <div
      className="rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl"
      style={{
        background: "var(--panel-bg)",
        border: `1px solid ${color}40`,
      }}
    >
      {/* Header bar with district color accent */}
      <div
        className="relative px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `2px solid ${color}60` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
          />
          <div>
            <h3
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color }}
            >
              {neighborhood.name}
            </h3>
            <p className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
              District Overview
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
          style={{ color: "var(--panel-text-muted)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Threat level + stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{ background: `${threat.color}20`, color: threat.color }}
            >
              {threat.label}
            </div>
            <span className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>
              {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
            </span>
          </div>
          {criticalCount > 0 && (
            <span className="text-[10px] font-semibold text-red-400">
              {criticalCount} critical
            </span>
          )}
        </div>

        {/* Category breakdown bars */}
        {breakdown.length > 0 && (
          <div className="space-y-1.5">
            {breakdown.slice(0, 5).map(([cat, count]) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta?.icon ?? Shield;
              const barColor = meta?.color ?? "#6b7280";
              const pct = Math.round((count / incidents.length) * 100);
              return (
                <div key={cat} className="flex items-center gap-2">
                  <Icon className="w-3 h-3 shrink-0" style={{ color: barColor }} />
                  <span
                    className="text-[10px] w-16 truncate capitalize"
                    style={{ color: "var(--panel-text-secondary)" }}
                  >
                    {meta?.label ?? cat}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel-input-bg)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                  <span className="text-[10px] w-6 text-right tabular-nums" style={{ color: "var(--panel-text-muted)" }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {breakdown.length === 0 && (
          <p className="text-xs text-center py-3" style={{ color: "var(--panel-text-muted)" }}>
            No incidents in this district
          </p>
        )}

        {/* Most recent incident */}
        {recentIncident && (
          <div
            className="rounded-lg p-2.5 space-y-1"
            style={{ background: "var(--panel-input-bg)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--panel-text-muted)" }}>
                Latest
              </span>
              {timeSinceRecent !== null && (
                <span className="text-[9px]" style={{ color: "var(--panel-text-muted)" }}>
                  {timeSinceRecent < 60 ? `${timeSinceRecent}m ago` : `${Math.round(timeSinceRecent / 60)}h ago`}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-tight" style={{ color: "var(--panel-text-secondary)" }}>
              {recentIncident.description
                ?? `${recentIncident.severity_category} reported at ${recentIncident.location_text ?? "unknown location"}`}
            </p>
          </div>
        )}

        {/* Top threat source */}
        {maxCategory && (
          <p className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
            Primary threat: <span style={{ color: CATEGORY_META[maxCategory[0]]?.color ?? "var(--panel-text-secondary)" }}>{CATEGORY_META[maxCategory[0]]?.label ?? maxCategory[0]}</span> ({maxCategory[1]})
          </p>
        )}
      </div>
    </div>
  );
}
