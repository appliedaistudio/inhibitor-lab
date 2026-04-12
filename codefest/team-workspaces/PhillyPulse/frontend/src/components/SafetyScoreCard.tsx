"use client";

import { Shield, MapPin, X, AlertTriangle, CheckCircle } from "lucide-react";
import type { Incident } from "@/lib/api";
import { assessSafety } from "@/lib/search";

interface Props {
  lat: number;
  lng: number;
  incidents: Incident[];
  onClose: () => void;
}

export default function SafetyScoreCard({ lat, lng, incidents, onClose }: Props) {
  const result = assessSafety(
    { display_name: "", lat, lng },
    incidents,
    0.8
  );

  const riskConfig = {
    low: { icon: CheckCircle, gradient: "from-green-500/20 to-emerald-500/10", border: "border-green-500/30", text: "text-green-500" },
    moderate: { icon: Shield, gradient: "from-yellow-500/20 to-amber-500/10", border: "border-yellow-500/30", text: "text-yellow-500" },
    elevated: { icon: AlertTriangle, gradient: "from-orange-500/20 to-red-500/10", border: "border-orange-500/30", text: "text-orange-500" },
    high: { icon: AlertTriangle, gradient: "from-red-500/20 to-red-600/10", border: "border-red-500/30", text: "text-red-500" },
  };

  const config = riskConfig[result.riskLevel];
  const RiskIcon = config.icon;

  const score = Math.max(0, 100 - result.nearbyCount * 15 - result.avgSeverity * 30);
  const scoreDisplay = Math.round(Math.max(0, Math.min(100, score)));

  return (
    <div
      className={`rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl border ${config.border}`}
      style={{ background: "var(--panel-bg)" }}
    >
      <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiskIcon className={`w-4 h-4 ${config.text}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>
              {result.riskLevel} Risk Area
            </span>
          </div>
          <button onClick={onClose} className="p-0.5" style={{ color: "var(--panel-text-muted)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--panel-text-secondary)" }}>
              <MapPin className="w-3 h-3" />
              <span className="font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>
              {result.nearbyCount} incident{result.nearbyCount !== 1 ? "s" : ""} within 800m
            </p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold font-mono" style={{ color: result.riskColor }}>
              {scoreDisplay}
            </div>
            <p className="text-[9px] font-mono uppercase" style={{ color: "var(--panel-text-muted)" }}>Safety Score</p>
          </div>
        </div>

        {result.nearbyIncidents.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase" style={{ color: "var(--panel-text-muted)" }}>Nearby Threats</p>
            {result.nearbyIncidents.slice(0, 3).map((inc) => (
              <div key={inc.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--panel-text-secondary)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                <span className="truncate">{inc.severity_category.replace(/_/g, " ")}</span>
                <span className="ml-auto shrink-0" style={{ color: "var(--panel-text-muted)" }}>
                  {inc.location_text?.split(",")[0] || "nearby"}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-center pt-1" style={{ color: "var(--panel-text-muted)" }}>
          Tap anywhere on the map to check safety
        </p>
      </div>
    </div>
  );
}
