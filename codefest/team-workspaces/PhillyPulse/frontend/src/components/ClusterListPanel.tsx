"use client";

import type { Incident } from "@/lib/api";
import { getSeverity } from "@/lib/severity";
import { X, MapPin, Clock, AlertTriangle, Radio } from "lucide-react";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  incidents: Incident[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function ClusterListPanel({ incidents, onSelect, onClose }: Props) {
  if (incidents.length === 0) return null;

  const loc = incidents[0].location_text || "Unknown Location";

  return (
    <div
      className="rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl"
      style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}
    >
      <div
        className="h-1"
        style={{
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6, transparent)",
        }}
      />

      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "rgba(59,130,246,0.85)" }}
            >
              {incidents.length}
            </div>
            <div className="min-w-0">
              <h3
                className="font-semibold text-sm truncate"
                style={{ color: "var(--panel-text)" }}
              >
                Overlapping Incidents
              </h3>
              <p
                className="text-[10px] truncate flex items-center gap-1"
                style={{ color: "var(--panel-text-muted)" }}
              >
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                {loc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="transition-colors p-1 -m-1 shrink-0"
            style={{ color: "var(--panel-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1.5">
          {incidents.map((inc) => {
            const sev = getSeverity(inc.severity_category);
            return (
              <button
                key={inc.id}
                onClick={() => onSelect(inc.id)}
                className="w-full text-left rounded-lg p-2.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: "var(--panel-input-bg)",
                  border: "1px solid var(--panel-border)",
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: sev.markerColor }}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
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
                        className="text-[9px] font-mono px-1 py-0.5 rounded border border-amber-500/30 text-amber-500 flex items-center gap-0.5"
                      >
                        <AlertTriangle className="w-2 h-2" />
                        UNVERIFIED
                      </span>
                      <span
                        className="text-[10px] flex items-center gap-1 ml-auto"
                        style={{ color: "var(--panel-text-muted)" }}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(inc.reported_at)}
                        <span className="opacity-60">{formatDate(inc.reported_at)}</span>
                      </span>
                    </div>

                    {inc.description ? (
                      <p
                        className="text-[11px] leading-snug line-clamp-2"
                        style={{ color: "var(--panel-text)" }}
                      >
                        {inc.description}
                      </p>
                    ) : (
                      <p
                        className="text-[11px] leading-snug line-clamp-2 italic flex items-start gap-1"
                        style={{ color: "var(--panel-text-secondary)" }}
                      >
                        <Radio className="w-3 h-3 shrink-0 mt-0.5" />
                        {inc.raw_text}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p
          className="text-[9px] text-center pt-0.5"
          style={{ color: "var(--panel-text-muted)" }}
        >
          Tap an incident to view details
        </p>
      </div>
    </div>
  );
}
