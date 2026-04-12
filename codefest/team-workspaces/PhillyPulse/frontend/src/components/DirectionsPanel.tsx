"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MapPin,
  Footprints,
  Bike,
  Car,
  Loader2,
  LocateFixed,
  X,
  ArrowUpDown,
  ChevronLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Play,
  Route,
  Clock,
  Star,
  Plus,
} from "lucide-react";
import { geocodePhilly, assessSafety } from "@/lib/search";
import { useSavedDestinations } from "@/hooks/useSavedDestinations";
import {
  getMultiStopRoute,
  buildAvoidZones,
  buildAvoidPolygons,
  type TransportMode,
} from "@/lib/routing";
import type { Incident } from "@/lib/api";
import type { RouteData } from "@/components/RoutePanel";
import type { WaypointPin } from "@/components/IncidentMap";
import {
  routeSafetyByHour,
  bestTravelWindow,
  incidentsNearRoute,
} from "@/lib/analytics";

const ORS_API_KEY =
  process.env.NEXT_PUBLIC_ORS_KEY || "5b3ce3597851110001cf6248a1b2c3d4e5f6a7b8";

const MODES: { id: TransportMode; label: string; icon: typeof Footprints }[] = [
  { id: "foot-walking", label: "Walking", icon: Footprints },
  { id: "cycling-regular", label: "Cycling", icon: Bike },
  { id: "driving-car", label: "Driving", icon: Car },
];

const STOP_COLORS = ["#f97316", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];

interface StopLoc {
  display_name: string;
  lat: number;
  lng: number;
}

interface Props {
  incidents: Incident[];
  originLoc: StopLoc | null;
  setOriginLoc: (loc: StopLoc | null) => void;
  originQuery: string;
  setOriginQuery: (q: string) => void;
  destLoc: StopLoc | null;
  setDestLoc: (loc: StopLoc | null) => void;
  destQuery: string;
  setDestQuery: (q: string) => void;
  stops: { query: string; loc: StopLoc | null }[];
  setStops: (s: { query: string; loc: StopLoc | null }[]) => void;
  activeMode: TransportMode;
  setActiveMode: (m: TransportMode) => void;
  userPos: { lat: number; lng: number } | null;
  gpsStatus: "idle" | "loading" | "found" | "denied";
  onBack: () => void;
  onFlyTo: (lat: number, lng: number) => void;
  onRoutesChange: (routes: RouteData | null) => void;
  onPreviewPins?: (
    origin: { lat: number; lng: number } | null,
    dest: { lat: number; lng: number } | null
  ) => void;
  onPreviewWaypoints?: (waypoints: WaypointPin[] | null) => void;
  onStartTrip: () => Promise<void>;
  routeGeometryForDemo?: [number, number][] | null;
  demoRouteSim: boolean;
  onDemoRouteSimChange: (active: boolean) => void;
  onHistoricalOverlay?: (incidents: Incident[] | null) => void;
}

export default function DirectionsPanel({
  incidents,
  originLoc,
  setOriginLoc,
  originQuery,
  setOriginQuery,
  destLoc,
  setDestLoc,
  destQuery,
  setDestQuery,
  stops,
  setStops,
  activeMode,
  setActiveMode,
  userPos,
  gpsStatus,
  onBack,
  onFlyTo,
  onRoutesChange,
  onPreviewPins,
  onPreviewWaypoints,
  onStartTrip,
  routeGeometryForDemo,
  demoRouteSim,
  onDemoRouteSimChange,
  onHistoricalOverlay,
}: Props) {
  const [originSuggestions, setOriginSuggestions] = useState<StopLoc[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<StopLoc[]>([]);
  const [stopSuggestions, setStopSuggestions] = useState<StopLoc[]>([]);
  const [originLoading, setOriginLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"origin" | "dest" | null>(null);
  const [activeStopIdx, setActiveStopIdx] = useState<number | null>(null);
  const [previewRoute, setPreviewRoute] = useState<{
    distanceKm: number;
    durationMin: number;
    isSafe: boolean;
    nearbyCount: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [startNavBusy, setStartNavBusy] = useState(false);
  const [showHistorical, setShowHistorical] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewAbortRef = useRef<AbortController | null>(null);
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  const { destinations: savedDests, canSave, addDestination } = useSavedDestinations();

  const geocode = useCallback(
    async (
      q: string,
      setter: (r: StopLoc[]) => void,
      loadingSetter: (b: boolean) => void
    ) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.trim().length < 2) {
        setter([]);
        loadingSetter(false);
        return;
      }
      loadingSetter(true);
      debounceRef.current = setTimeout(async () => {
        const results = await geocodePhilly(q);
        setter(results);
        loadingSetter(false);
      }, 200);
    },
    []
  );

  const allWaypoints = useCallback((): { label: string; loc: StopLoc }[] => {
    const result: { label: string; loc: StopLoc }[] = [];
    if (originLoc) result.push({ label: "A", loc: originLoc });
    stops.forEach((s, i) => {
      if (s.loc) result.push({ label: String.fromCharCode(66 + i), loc: s.loc });
    });
    if (destLoc) result.push({ label: String.fromCharCode(66 + stops.length), loc: destLoc });
    return result;
  }, [originLoc, destLoc, stops]);

  const syncPreviewPins = useCallback(() => {
    const wps = allWaypoints();
    if (wps.length >= 2) {
      const pins: WaypointPin[] = wps.map((wp, i) => ({
        label: wp.label,
        lat: wp.loc.lat,
        lng: wp.loc.lng,
        color:
          i === 0
            ? "#22c55e"
            : i === wps.length - 1
              ? "#ef4444"
              : STOP_COLORS[(i - 1) % STOP_COLORS.length],
        glowColor:
          i === 0
            ? "rgba(34,197,94,0.5)"
            : i === wps.length - 1
              ? "rgba(239,68,68,0.5)"
              : STOP_COLORS[(i - 1) % STOP_COLORS.length] + "80",
      }));
      onPreviewWaypoints?.(pins);
    } else {
      onPreviewWaypoints?.(null);
    }
  }, [allWaypoints, onPreviewWaypoints]);

  useEffect(() => {
    syncPreviewPins();
  }, [originLoc, destLoc, stops, syncPreviewPins]);

  useEffect(() => {
    if (!originLoc || !destLoc) {
      setPreviewRoute(null);
      return;
    }
    const intermediateReady = stops.every((s) => s.query.trim() === "" || s.loc !== null);
    if (!intermediateReady) {
      setPreviewRoute(null);
      return;
    }

    if (previewAbortRef.current) previewAbortRef.current.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;

    setPreviewLoading(true);
    setRouteError(null);

    const waypoints: [number, number][] = [
      [originLoc.lat, originLoc.lng],
      ...stops.filter((s) => s.loc).map((s) => [s.loc!.lat, s.loc!.lng] as [number, number]),
      [destLoc.lat, destLoc.lng],
    ];
    const incSnap = incidentsRef.current;
    const safety = assessSafety(
      { display_name: destLoc.display_name, lat: destLoc.lat, lng: destLoc.lng },
      incSnap
    );

    (async () => {
      try {
        const directRoute = await getMultiStopRoute(ORS_API_KEY, activeMode, waypoints);
        if (controller.signal.aborted) return;

        if (!directRoute) {
          onRoutesChange(null);
          setPreviewRoute(null);
          setRouteError("Could not load a street route. Check your network or try another mode.");
          return;
        }

        if (safety.nearbyCount === 0) {
          onRoutesChange({ normal: directRoute, safe: null, avoidZones: [] });
          setPreviewRoute({
            distanceKm: directRoute.distanceKm,
            durationMin: directRoute.durationMin,
            isSafe: false,
            nearbyCount: 0,
          });
        } else {
          const zones = buildAvoidZones(incSnap);
          const safeRoute = await getMultiStopRoute(
            ORS_API_KEY,
            activeMode,
            waypoints,
            buildAvoidPolygons(zones)
          );
          if (controller.signal.aborted) return;
          const best = safeRoute || directRoute;
          onRoutesChange({ normal: directRoute, safe: safeRoute, avoidZones: zones });
          setPreviewRoute({
            distanceKm: best.distanceKm,
            durationMin: best.durationMin,
            isSafe: !!safeRoute,
            nearbyCount: safety.nearbyCount,
          });
        }
        setRouteError(null);
      } catch {
        if (!controller.signal.aborted) {
          setPreviewRoute(null);
          onRoutesChange(null);
          setRouteError("Routing request failed.");
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    })();

    return () => controller.abort();
  }, [originLoc, destLoc, stops, activeMode, onRoutesChange]);

  const swapLocations = () => {
    const tmpQ = originQuery;
    const tmpL = originLoc;
    setOriginQuery(destQuery);
    setOriginLoc(destLoc);
    setDestQuery(tmpQ);
    setDestLoc(tmpL);
    onPreviewPins?.(destLoc, tmpL);
  };

  const handleStartTrip = async () => {
    setStartNavBusy(true);
    try {
      await onStartTrip();
    } finally {
      setStartNavBusy(false);
    }
  };

  const renderSuggestion = (
    s: StopLoc,
    i: number,
    onSelect: () => void
  ) => {
    const parts = s.display_name.split(",");
    const primary = parts[0].trim();
    const secondary = parts.slice(1, 3).map((p) => p.trim()).join(", ");
    return (
      <div
        key={i}
        onClick={onSelect}
        className="w-full text-left px-4 py-3 flex items-start gap-3 last:border-0 transition-colors cursor-pointer"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "var(--panel-input-bg)" }}
        >
          <MapPin className="w-4 h-4" style={{ color: "var(--panel-text-muted)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: "var(--panel-text)" }}>
            {primary}
          </p>
          {secondary && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--panel-text-muted)" }}>
              {secondary}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--panel-text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium" style={{ color: "var(--panel-text)" }}>
          Directions
        </span>
      </div>

      <div className="flex" style={{ borderBottom: "1px solid var(--panel-border)" }}>
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = activeMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all border-b-2 ${
                active ? "border-blue-500 text-blue-500" : "border-transparent"
              }`}
              style={!active ? { color: "var(--panel-text-secondary)" } : {}}
            >
              <Icon className="w-5 h-5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        <div className="flex gap-2">
          <div className="flex flex-col items-center pt-3 gap-0">
            <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-500/20" />
            {stops.map((_, i) => (
              <div key={`dot-${i}`} className="contents">
                <div className="w-0.5 flex-1 my-1" style={{ background: "var(--panel-border)" }} />
                <div
                  className="w-3 h-3 rounded-full ring-4"
                  style={{
                    backgroundColor: STOP_COLORS[i % STOP_COLORS.length],
                    ["--tw-ring-color" as string]: STOP_COLORS[i % STOP_COLORS.length] + "30",
                  }}
                />
              </div>
            ))}
            <div className="w-0.5 flex-1 my-1" style={{ background: "var(--panel-border)" }} />
            <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-500/20" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="relative">
              <input
                type="text"
                value={originQuery}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  setOriginLoc(null);
                  setActiveDropdown("origin");
                  geocode(e.target.value, setOriginSuggestions, setOriginLoading);
                }}
                onFocus={() => {
                  setActiveDropdown("origin");
                  if (originQuery.length >= 2 && !originLoc)
                    geocode(originQuery, setOriginSuggestions, setOriginLoading);
                }}
                placeholder="A · Starting point"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500/30"
                style={{
                  background: "var(--panel-input-bg)",
                  border: "1px solid var(--panel-input-border)",
                  color: "var(--panel-text)",
                }}
              />
              {originLoc && (
                <button
                  onClick={() => {
                    setOriginLoc(null);
                    setOriginQuery("");
                    onRoutesChange(null);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full"
                  style={{ color: "var(--panel-text-muted)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {!originLoc && gpsStatus === "found" && (
                <button
                  onClick={() => {
                    setOriginLoc({ display_name: "Your location", ...userPos! });
                    setOriginQuery("Your location");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-blue-500/50 hover:text-blue-500"
                  title="Use my location"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
            </div>

            {stops.map((stop, idx) => (
              <div key={idx} className="relative flex gap-1">
                <input
                  type="text"
                  value={stop.query}
                  onChange={(e) => {
                    const next = [...stops];
                    next[idx] = { ...next[idx], query: e.target.value, loc: null };
                    setStops(next);
                    setActiveStopIdx(idx);
                    setActiveDropdown(null);
                    geocode(e.target.value, setStopSuggestions, setStopLoading);
                  }}
                  onFocus={() => {
                    setActiveStopIdx(idx);
                    if (stop.query.length >= 2 && !stop.loc)
                      geocode(stop.query, setStopSuggestions, setStopLoading);
                  }}
                  placeholder={`${String.fromCharCode(66 + idx)} · Stop`}
                  className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    background: "var(--panel-input-bg)",
                    border: "1px solid var(--panel-input-border)",
                    color: "var(--panel-text)",
                  }}
                />
                <button
                  onClick={() => {
                    setStops(stops.filter((_, i) => i !== idx));
                    onRoutesChange(null);
                  }}
                  className="p-1.5 rounded-lg self-center"
                  style={{ color: "var(--panel-text-muted)" }}
                  title="Remove stop"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="relative">
              <input
                type="text"
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setDestLoc(null);
                  setActiveDropdown("dest");
                  geocode(e.target.value, setDestSuggestions, setDestLoading);
                }}
                onFocus={() => {
                  setActiveDropdown("dest");
                  if (destQuery.length >= 2 && !destLoc)
                    geocode(destQuery, setDestSuggestions, setDestLoading);
                }}
                placeholder={`${String.fromCharCode(66 + stops.length)} · Destination`}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500/30"
                style={{
                  background: "var(--panel-input-bg)",
                  border: "1px solid var(--panel-input-border)",
                  color: "var(--panel-text)",
                }}
                autoFocus={!destLoc}
              />
              {destLoc && (
                <button
                  onClick={() => {
                    setDestLoc(null);
                    setDestQuery("");
                    setRouteError(null);
                    onRoutesChange(null);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full"
                  style={{ color: "var(--panel-text-muted)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={swapLocations}
            className="self-start mt-3 p-2 rounded-full transition-colors"
            style={{ color: "var(--panel-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {stops.length < 5 && (
          <button
            onClick={() => setStops([...stops, { query: "", loc: null }])}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors rounded-lg"
            style={{ color: "var(--panel-text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Plus className="w-3.5 h-3.5" /> Add stop
          </button>
        )}

        {previewLoading && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{ background: "var(--panel-input-bg)" }}
          >
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>
              Calculating route...
            </span>
          </div>
        )}

        {routeError && !previewLoading && (
          <div
            className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-red-400"
            style={{ background: "rgba(239,68,68,0.08)" }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{routeError}</span>
          </div>
        )}

        {previewRoute && !previewLoading && (
          <div
            className="mt-3 rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--panel-border)" }}
          >
            <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-500/10">
              <Route className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-bold text-blue-500">
                  {Math.ceil(previewRoute.durationMin)} min
                </span>
                <span className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>
                  {previewRoute.distanceKm.toFixed(1)} km
                </span>
              </div>
              <div
                className="flex items-center gap-1 text-xs"
                style={{ color: "var(--panel-text-muted)" }}
              >
                <Clock className="w-3 h-3" />
                {MODES.find((m) => m.id === activeMode)?.label}
              </div>
            </div>
            {previewRoute.nearbyCount > 0 && previewRoute.isSafe && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-600 dark:text-green-400/80 bg-green-500/5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Safe route avoiding {previewRoute.nearbyCount} incident
                {previewRoute.nearbyCount > 1 ? "s" : ""}
              </div>
            )}
            {previewRoute.nearbyCount > 0 && !previewRoute.isSafe && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400/80 bg-amber-500/5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {previewRoute.nearbyCount} incident
                {previewRoute.nearbyCount > 1 ? "s" : ""} near route
              </div>
            )}
            {previewRoute.nearbyCount === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-600 dark:text-green-400/80 bg-green-500/5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Route is clear — no incidents nearby
              </div>
            )}
          </div>
        )}

        {/* Route Safety Timeline */}
        {previewRoute && !previewLoading && routeGeometryForDemo && routeGeometryForDemo.length >= 2 && (() => {
          const hourCounts = routeSafetyByHour(routeGeometryForDemo, incidents);
          const maxCount = Math.max(...hourCounts, 1);
          const best = bestTravelWindow(hourCounts);
          const fmtH = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

          return (
            <div
              className="mt-3 rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--panel-border)" }}
            >
              <div className="px-3 py-2">
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--panel-text-muted)" }}
                >
                  Safety by Hour of Day
                </p>
                <div className="flex h-4 rounded-sm overflow-hidden gap-px">
                  {hourCounts.map((count, h) => {
                    const intensity = count / maxCount;
                    const color =
                      intensity < 0.2
                        ? "#22c55e"
                        : intensity < 0.5
                          ? "#eab308"
                          : intensity < 0.75
                            ? "#f97316"
                            : "#ef4444";
                    return (
                      <div
                        key={h}
                        className="flex-1 transition-colors"
                        style={{ backgroundColor: color, opacity: Math.max(0.3, intensity) }}
                        title={`${fmtH(h)}: ${count} incident${count !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
                <div
                  className="flex justify-between mt-1 text-[8px]"
                  style={{ color: "var(--panel-text-muted)" }}
                >
                  <span>12am</span>
                  <span>6am</span>
                  <span>12pm</span>
                  <span>6pm</span>
                  <span>12am</span>
                </div>
              </div>

              <div
                className="flex items-center gap-2 px-3 py-2 text-xs bg-green-500/5"
                style={{ borderTop: "1px solid var(--panel-border)" }}
              >
                <Clock className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span style={{ color: "var(--panel-text-secondary)" }}>
                  Best time:{" "}
                  <strong className="text-green-500">
                    {fmtH(best.startHour)} – {fmtH(best.endHour)}
                  </strong>
                </span>
              </div>

              <label
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs"
                style={{
                  borderTop: "1px solid var(--panel-border)",
                  color: "var(--panel-text-secondary)",
                }}
              >
                <input
                  type="checkbox"
                  checked={showHistorical}
                  onChange={(e) => {
                    setShowHistorical(e.target.checked);
                    if (e.target.checked) {
                      const nearby = incidentsNearRoute(routeGeometryForDemo!, incidents);
                      onHistoricalOverlay?.(nearby);
                    } else {
                      onHistoricalOverlay?.(null);
                    }
                  }}
                  className="rounded border-gray-500 accent-blue-500"
                />
                Show 30-day incidents near route
              </label>
            </div>
          );
        })()}

        {routeGeometryForDemo && routeGeometryForDemo.length >= 2 && (
          <label
            className="mt-3 flex items-start gap-2.5 cursor-pointer text-xs px-1 leading-snug"
            style={{ color: "var(--panel-text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={demoRouteSim}
              onChange={(e) => onDemoRouteSimChange(e.target.checked)}
              className="mt-0.5 rounded border-gray-500 accent-blue-500"
            />
            <span>
              Demo: simulate walking speed (~100&nbsp;m per minute) along the route to test the
              live icon.
            </span>
          </label>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void handleStartTrip()}
            disabled={!originLoc || !destLoc || startNavBusy}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-all ${
              originLoc && destLoc
                ? startNavBusy
                  ? "bg-blue-500 text-white cursor-wait opacity-90"
                  : "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                : "cursor-not-allowed"
            }`}
            style={
              !(originLoc && destLoc)
                ? { background: "var(--panel-input-bg)", color: "var(--panel-text-muted)" }
                : {}
            }
          >
            {startNavBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {startNavBusy ? "Starting…" : "Preview Route"}
          </button>
          {canSave && destLoc && (
            <button
              onClick={() => {
                if (destLoc) {
                  void addDestination(destLoc.display_name.split(",")[0], destLoc.lat, destLoc.lng);
                }
              }}
              className="flex items-center justify-center w-12 py-3 rounded-full transition-all border"
              style={{
                background: savedDests.some(
                  (d) =>
                    Math.abs(d.lat - destLoc.lat) < 0.0001 &&
                    Math.abs(d.lng - destLoc.lng) < 0.0001
                )
                  ? "rgba(245,158,11,0.15)"
                  : "var(--panel-input-bg)",
                borderColor: savedDests.some(
                  (d) =>
                    Math.abs(d.lat - destLoc.lat) < 0.0001 &&
                    Math.abs(d.lng - destLoc.lng) < 0.0001
                )
                  ? "rgba(245,158,11,0.3)"
                  : "var(--panel-border)",
              }}
              title={
                savedDests.some(
                  (d) =>
                    Math.abs(d.lat - destLoc.lat) < 0.0001 &&
                    Math.abs(d.lng - destLoc.lng) < 0.0001
                )
                  ? "Saved"
                  : "Save destination"
              }
            >
              <Star
                className={`w-4 h-4 ${
                  savedDests.some(
                    (d) =>
                      Math.abs(d.lat - destLoc.lat) < 0.0001 &&
                      Math.abs(d.lng - destLoc.lng) < 0.0001
                  )
                    ? "text-amber-500 fill-amber-500"
                    : ""
                }`}
                style={
                  !savedDests.some(
                    (d) =>
                      Math.abs(d.lat - destLoc.lat) < 0.0001 &&
                      Math.abs(d.lng - destLoc.lng) < 0.0001
                  )
                    ? { color: "var(--panel-text-muted)" }
                    : {}
                }
              />
            </button>
          )}
        </div>
      </div>

      {activeDropdown === "origin" &&
        !originLoc &&
        (originSuggestions.length > 0 || originLoading) && (
          <div
            className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg max-h-[240px] overflow-y-auto"
            style={{
              background: "var(--panel-bg-secondary)",
              border: "1px solid var(--panel-border)",
            }}
          >
            {originLoading && originSuggestions.length === 0 && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: "var(--panel-text-muted)" }}
                />
                <span className="text-xs" style={{ color: "var(--panel-text-muted)" }}>
                  Searching...
                </span>
              </div>
            )}
            {originSuggestions.map((s, i) =>
              renderSuggestion(s, i, () => {
                setOriginLoc(s);
                setOriginQuery(s.display_name.split(",")[0]);
                setOriginSuggestions([]);
                setActiveDropdown(null);
                onFlyTo(s.lat, s.lng);
                onPreviewPins?.(s, destLoc);
              })
            )}
          </div>
        )}

      {activeDropdown === "dest" &&
        !destLoc &&
        (destSuggestions.length > 0 || destLoading) && (
          <div
            className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg max-h-[240px] overflow-y-auto"
            style={{
              background: "var(--panel-bg-secondary)",
              border: "1px solid var(--panel-border)",
            }}
          >
            {destLoading && destSuggestions.length === 0 && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: "var(--panel-text-muted)" }}
                />
                <span className="text-xs" style={{ color: "var(--panel-text-muted)" }}>
                  Searching...
                </span>
              </div>
            )}
            {destSuggestions.map((s, i) =>
              renderSuggestion(s, i, () => {
                setDestLoc(s);
                setDestQuery(s.display_name.split(",")[0]);
                setDestSuggestions([]);
                setActiveDropdown(null);
                onFlyTo(s.lat, s.lng);
                onPreviewPins?.(originLoc, s);
              })
            )}
          </div>
        )}

      {activeStopIdx !== null &&
        stops[activeStopIdx] &&
        !stops[activeStopIdx].loc &&
        (stopSuggestions.length > 0 || stopLoading) && (
          <div
            className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg max-h-[240px] overflow-y-auto"
            style={{
              background: "var(--panel-bg-secondary)",
              border: "1px solid var(--panel-border)",
            }}
          >
            {stopLoading && stopSuggestions.length === 0 && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: "var(--panel-text-muted)" }}
                />
                <span className="text-xs" style={{ color: "var(--panel-text-muted)" }}>
                  Searching...
                </span>
              </div>
            )}
            {stopSuggestions.map((s, i) =>
              renderSuggestion(s, i, () => {
                const next = [...stops];
                next[activeStopIdx] = { query: s.display_name.split(",")[0], loc: s };
                setStops(next);
                setStopSuggestions([]);
                setActiveStopIdx(null);
                onFlyTo(s.lat, s.lng);
              })
            )}
          </div>
        )}

      <div className="flex-1" />
    </>
  );
}
