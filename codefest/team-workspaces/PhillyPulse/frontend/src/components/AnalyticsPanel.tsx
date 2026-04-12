"use client";

import { useMemo } from "react";
import { X, TrendingUp, Grid3X3, BarChart3 } from "lucide-react";
import type { Incident } from "@/lib/api";
import { trendByDay, timeGrid, areaVsCityComparison } from "@/lib/analytics";
import Sparkline from "@/components/charts/Sparkline";
import TimeGrid from "@/components/charts/TimeGrid";

interface Props {
  incidents: Incident[];
  areaIncidents?: Incident[];
  areaName?: string;
  onClose: () => void;
}

export default function AnalyticsPanel({
  incidents,
  areaIncidents,
  areaName,
  onClose,
}: Props) {
  const displayIncidents = areaIncidents ?? incidents;

  const trends = useMemo(() => trendByDay(displayIncidents, 30), [displayIncidents]);
  const grid = useMemo(() => timeGrid(displayIncidents), [displayIncidents]);
  const comparison = useMemo(
    () =>
      areaIncidents ? areaVsCityComparison(areaIncidents, incidents) : null,
    [areaIncidents, incidents]
  );

  return (
    <div
      className="rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl"
      style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
      >
        <h3
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: "var(--panel-text)" }}
        >
          <BarChart3 className="w-4 h-4 text-blue-500" />
          {areaName ? `${areaName} Analytics` : "City Analytics"}
        </h3>
        <button
          onClick={onClose}
          className="p-1 -m-1 transition-colors"
          style={{ color: "var(--panel-text-muted)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Crime Trend Sparklines */}
        <div>
          <h4
            className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: "var(--panel-text-muted)" }}
          >
            <TrendingUp className="w-3 h-3" />
            30-Day Trends
          </h4>
          <div className="space-y-2">
            {trends.map((trend) => {
              const total = trend.data.reduce((s, d) => s + d.count, 0);
              if (total === 0) return null;
              return (
                <div key={trend.label} className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-medium w-14 shrink-0"
                    style={{ color: trend.color }}
                  >
                    {trend.label}
                  </span>
                  <Sparkline
                    data={trend.data.map((d) => d.count)}
                    color={trend.color}
                    width={140}
                    height={24}
                    filled
                    className="flex-1"
                  />
                  <span
                    className="text-[10px] font-mono w-8 text-right"
                    style={{ color: "var(--panel-text-secondary)" }}
                  >
                    {total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time-of-Day Heatmap */}
        <div>
          <h4
            className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: "var(--panel-text-muted)" }}
          >
            <Grid3X3 className="w-3 h-3" />
            Incident Heatmap (Day × Hour)
          </h4>
          <TimeGrid data={grid} width={320} height={120} />
        </div>

        {/* Area vs City Comparison */}
        {comparison && (
          <div>
            <h4
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--panel-text-muted)" }}
            >
              {areaName ?? "Area"} vs City Average
            </h4>
            <div className="space-y-1.5">
              {comparison.map((cat) => {
                const diff = cat.areaRate - cat.cityRate;
                const isAbove = diff > 0.01;
                const isBelow = diff < -0.01;
                const barWidth = Math.min(
                  100,
                  Math.max(5, Math.round(cat.areaRate * 500))
                );
                return (
                  <div key={cat.label} className="flex items-center gap-2">
                    <span
                      className="text-[10px] w-14 shrink-0"
                      style={{ color: "var(--panel-text-secondary)" }}
                    >
                      {cat.label}
                    </span>
                    <div
                      className="flex-1 h-3 rounded-full overflow-hidden"
                      style={{ background: "var(--panel-input-bg)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: isAbove
                            ? "#ef4444"
                            : isBelow
                              ? "#22c55e"
                              : cat.color,
                        }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-mono w-10 text-right"
                      style={{
                        color: isAbove
                          ? "#ef4444"
                          : isBelow
                            ? "#22c55e"
                            : "var(--panel-text-muted)",
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
        )}
      </div>
    </div>
  );
}
