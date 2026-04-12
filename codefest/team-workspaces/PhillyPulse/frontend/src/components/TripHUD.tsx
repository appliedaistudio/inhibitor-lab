"use client";

import {
  ShieldCheck,
  Navigation,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Footprints,
  Bike,
  Car,
} from "lucide-react";
import type { Incident } from "@/lib/api";
import { getSeverity } from "@/lib/severity";
import type { TransportMode } from "@/lib/routing";

const MODES: { id: TransportMode; label: string; icon: typeof Footprints }[] = [
  { id: "foot-walking", label: "Walking", icon: Footprints },
  { id: "cycling-regular", label: "Cycling", icon: Bike },
  { id: "driving-car", label: "Driving", icon: Car },
];

const STOP_COLORS = ["#f97316", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];

interface RouteInfo {
  isSafe: boolean;
  distanceKm: number;
  durationMin: number;
  nearbyCount: number;
}

interface Props {
  routeInfo: RouteInfo;
  originQuery: string;
  destQuery: string;
  stops: { query: string }[];
  activeMode: TransportMode;
  tripProgress: number;
  routeGeometryForDemo: [number, number][] | null;
  demoRouteSim: boolean;
  onDemoRouteSimChange: (active: boolean) => void;
  onResetTrip: () => void;
  recentIncidents: Incident[];
  onSelectIncident: (id: string) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

export default function TripHUD({
  routeInfo,
  originQuery,
  destQuery,
  stops,
  activeMode,
  tripProgress,
  routeGeometryForDemo,
  demoRouteSim,
  onDemoRouteSimChange,
  onResetTrip,
  recentIncidents,
  onSelectIncident,
  onFlyTo,
}: Props) {
  return (
    <>
      <div className={`p-4 ${routeInfo.isSafe ? "bg-green-500/10" : "bg-blue-500/10"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {routeInfo.isSafe ? (
              <ShieldCheck className="w-5 h-5 text-green-500" />
            ) : (
              <Navigation className="w-5 h-5 text-blue-500" />
            )}
            <span
              className={`text-sm font-semibold ${routeInfo.isSafe ? "text-green-500" : "text-blue-500"}`}
            >
              {routeInfo.isSafe ? "Safe Route Preview" : "Route Preview"}
            </span>
          </div>
          <button
            onClick={onResetTrip}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors"
            style={{
              color: "var(--panel-text-secondary)",
              background: "var(--panel-input-bg)",
            }}
          >
            <RotateCcw className="w-3 h-3" /> End
          </button>
        </div>

        <div className="flex gap-6 items-end">
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--panel-text)" }}>
              {Math.max(0, Math.ceil(routeInfo.durationMin * (1 - tripProgress)))} min
            </p>
            <p className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>
              {Math.max(0, routeInfo.distanceKm * (1 - tripProgress)).toFixed(1)} km remaining
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--panel-text-secondary)" }}
          >
            {(() => {
              const M = MODES.find((m) => m.id === activeMode);
              return M ? <M.icon className="w-4 h-4" /> : null;
            })()}
            {MODES.find((m) => m.id === activeMode)?.label}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: "var(--panel-input-bg)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.min(100, tripProgress * 100)}%`,
                background: routeInfo.isSafe
                  ? "linear-gradient(90deg, #22c55e, #4ade80)"
                  : "linear-gradient(90deg, #3b82f6, #60a5fa)",
              }}
            />
          </div>
          <div
            className="flex justify-between text-[10px]"
            style={{ color: "var(--panel-text-muted)" }}
          >
            <span>{(routeInfo.distanceKm * tripProgress).toFixed(1)} km traveled</span>
            <span>{Math.round(tripProgress * 100)}%</span>
          </div>
        </div>

        {routeGeometryForDemo && routeGeometryForDemo.length >= 2 && (
          <label
            className="mt-3 flex items-start gap-2.5 cursor-pointer text-xs leading-snug"
            style={{ color: "var(--panel-text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={demoRouteSim}
              onChange={(e) => onDemoRouteSimChange(e.target.checked)}
              className="mt-0.5 rounded border-gray-500 accent-blue-500"
            />
            <span>
              Demo: simulate ~100&nbsp;m/min along route (tests live vehicle without GPS walk).
            </span>
          </label>
        )}

        {routeInfo.isSafe && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400/70 bg-green-500/10 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Avoiding incidents — safe route active
          </div>
        )}
        {!routeInfo.isSafe && routeInfo.nearbyCount === 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400/70 bg-green-500/10 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Route is clear — no incidents detected
          </div>
        )}
        {routeInfo.nearbyCount > 0 && !routeInfo.isSafe && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400/70 bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {routeInfo.nearbyCount} incident{routeInfo.nearbyCount > 1 ? "s" : ""} near route —
            proceed with caution
          </div>
        )}
      </div>

      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--panel-border)" }}>
        <div
          className="flex items-center gap-3 text-xs"
          style={{ color: "var(--panel-text-secondary)" }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="truncate">{originQuery}</span>
        </div>
        {stops.map((stop, idx) => (
          <div key={idx}>
            <div className="ml-1 w-px h-3" style={{ background: "var(--panel-border)" }} />
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: "var(--panel-text-secondary)" }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: STOP_COLORS[idx % STOP_COLORS.length] }}
              />
              <span className="truncate">{stop.query}</span>
            </div>
          </div>
        ))}
        <div className="ml-1 w-px h-3" style={{ background: "var(--panel-border)" }} />
        <div
          className="flex items-center gap-3 text-xs"
          style={{ color: "var(--panel-text-secondary)" }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="truncate">{destQuery}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <h3
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--panel-text-muted)" }}
          >
            Incidents Near Route
          </h3>
        </div>
        {recentIncidents
          .filter((inc) => inc.lat && inc.lng)
          .slice(0, 8)
          .map((inc) => {
            const sev = getSeverity(inc.severity_category);
            return (
              <button
                key={inc.id}
                onClick={() => {
                  onSelectIncident(inc.id);
                  onFlyTo(inc.lat!, inc.lng!);
                }}
                className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
                style={{ borderBottom: "1px solid var(--panel-border)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--panel-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: sev.markerColor }}
                />
                <div className="min-w-0">
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--panel-text-secondary)" }}
                  >
                    {inc.location_text || "Unknown"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
                    {sev.label}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </>
  );
}
