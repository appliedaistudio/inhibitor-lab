"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Navigation, Flame, Radio, Shield, TrendingUp, TrendingDown, MapPin, Minus } from "lucide-react";
import Sparkline from "@/components/charts/Sparkline";
import { assessSafety } from "@/lib/search";
import {
  getMultiStopRoute,
  buildAvoidZones,
  buildAvoidPolygons,
  type TransportMode,
} from "@/lib/routing";
import type { Incident } from "@/lib/api";
import type { RouteData } from "@/components/RoutePanel";
import type { WaypointPin } from "@/components/IncidentMap";
import { getSeverity } from "@/lib/severity";
import { pointAtDistanceMeters, routeLengthMeters } from "@/lib/route-geometry";
import SearchInput from "@/components/SearchInput";
import SavedPlaces from "@/components/SavedPlaces";
import DirectionsPanel from "@/components/DirectionsPanel";
import TripHUD from "@/components/TripHUD";
import IncidentFeed from "@/components/IncidentFeed";

const ORS_API_KEY =
  process.env.NEXT_PUBLIC_ORS_KEY || "5b3ce3597851110001cf6248a1b2c3d4e5f6a7b8";

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

type View = "search" | "directions" | "trip";

interface StopLoc {
  display_name: string;
  lat: number;
  lng: number;
}

interface HotNeighborhood {
  name: string;
  slug: string;
  count: number;
}

interface CategoryBreakdownItem {
  label: string;
  color: string;
  cats: readonly string[];
  count: number;
}

interface Props {
  incidents: Incident[];
  onFlyTo: (lat: number, lng: number) => void;
  onRoutesChange: (routes: RouteData | null) => void;
  onUserLocation?: (lat: number, lng: number) => void;
  onTripActive?: (active: boolean, routeGeometry?: [number, number][], mode?: TransportMode) => void;
  onPreviewPins?: (origin: { lat: number; lng: number } | null, dest: { lat: number; lng: number } | null) => void;
  onPreviewWaypoints?: (waypoints: WaypointPin[] | null) => void;
  onSelectIncident?: (id: string) => void;
  selectedId?: string | null;
  tripProgress?: number;
  onGpsStatusChange?: (status: "idle" | "loading" | "found" | "denied") => void;
  routeGeometryForDemo?: [number, number][] | null;
  onRouteDemoSimChange?: (active: boolean) => void;
  timeFilterLabel?: string;
  trendPct?: number;
  hotNeighborhoods?: HotNeighborhood[];
  categoryBreakdown?: CategoryBreakdownItem[];
  hourlyData?: number[];
  onToggleCat?: (cats: readonly string[]) => void;
}

export default function SearchSidebar({
  incidents,
  onFlyTo,
  onRoutesChange,
  onUserLocation,
  onTripActive,
  onPreviewPins,
  onPreviewWaypoints,
  onSelectIncident,
  selectedId,
  tripProgress = 0,
  onGpsStatusChange,
  routeGeometryForDemo = null,
  onRouteDemoSimChange,
  timeFilterLabel,
  trendPct = 0,
  hotNeighborhoods = [],
  categoryBreakdown = [],
  hourlyData = [],
  onToggleCat,
}: Props) {
  const [view, setView] = useState<View>("search");
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [originLoc, setOriginLoc] = useState<StopLoc | null>(null);
  const [destLoc, setDestLoc] = useState<StopLoc | null>(null);
  const [stops, setStops] = useState<{ query: string; loc: StopLoc | null }[]>([]);
  const [activeMode, setActiveMode] = useState<TransportMode>("driving-car");
  const [routeInfo, setRouteInfo] = useState<{
    isSafe: boolean;
    distanceKm: number;
    durationMin: number;
    nearbyCount: number;
  } | null>(null);
  const [demoRouteSim, setDemoRouteSim] = useState(false);
  const demoRouteSimRef = useRef(false);
  const demoDistMRef = useRef(0);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "found" | "denied">("idle");
  const destLocRef = useRef(destLoc);
  destLocRef.current = destLoc;
  const onUserLocationRef = useRef(onUserLocation);
  onUserLocationRef.current = onUserLocation;
  const onPreviewPinsRef = useRef(onPreviewPins);
  onPreviewPinsRef.current = onPreviewPins;
  const lastGpsEmitRef = useRef<{ t: number; lat: number; lng: number } | null>(null);
  const seededOriginQueryRef = useRef(false);
  const onGpsStatusChangeRef = useRef(onGpsStatusChange);
  onGpsStatusChangeRef.current = onGpsStatusChange;
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  useEffect(() => {
    onGpsStatusChangeRef.current?.(gpsStatus);
  }, [gpsStatus]);

  useEffect(() => {
    demoRouteSimRef.current = demoRouteSim;
  }, [demoRouteSim]);

  useEffect(() => {
    if (view !== "directions" && view !== "trip") {
      setDemoRouteSim(false);
    }
  }, [view]);

  useEffect(() => {
    if (!routeGeometryForDemo || routeGeometryForDemo.length < 2) {
      setDemoRouteSim(false);
    }
  }, [routeGeometryForDemo]);

  useEffect(() => {
    if (!demoRouteSim || !routeGeometryForDemo || routeGeometryForDemo.length < 2) {
      onRouteDemoSimChange?.(false);
      return;
    }
    const geo = routeGeometryForDemo;
    const totalM = routeLengthMeters(geo);
    if (totalM < 1) {
      onRouteDemoSimChange?.(false);
      return;
    }
    onRouteDemoSimChange?.(true);
    demoDistMRef.current = 0;
    const metersPerSecond = 100 / 60;

    const apply = (distM: number) => {
      const p = pointAtDistanceMeters(geo, distM);
      if (!p) return;
      const loc = { lat: p[0], lng: p[1] };
      setUserPos(loc);
      setOriginLoc((prev) => {
        if (prev?.display_name === "Your location") return { ...prev, ...loc };
        return prev;
      });
      onUserLocationRef.current?.(loc.lat, loc.lng);
      const d = destLocRef.current;
      onPreviewPinsRef.current?.(loc, d ? { lat: d.lat, lng: d.lng } : null);
    };

    const tick = () => {
      demoDistMRef.current += metersPerSecond;
      if (demoDistMRef.current >= totalM) demoDistMRef.current = 0;
      apply(demoDistMRef.current);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      onRouteDemoSimChange?.(false);
    };
  }, [demoRouteSim, routeGeometryForDemo, onRouteDemoSimChange]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      const fb = { lat: 39.9526, lng: -75.1652 };
      setOriginLoc({ display_name: "Philadelphia Center", ...fb });
      setOriginQuery("Philadelphia Center");
      onPreviewPinsRef.current?.(fb, null);
      onUserLocationRef.current?.(fb.lat, fb.lng);
      return;
    }
    setGpsStatus("loading");

    const emit = (loc: { lat: number; lng: number }) => {
      if (demoRouteSimRef.current) return;
      const now = Date.now();
      const prev = lastGpsEmitRef.current;
      const movedM = prev ? haversineM(prev.lat, prev.lng, loc.lat, loc.lng) : Infinity;
      if (prev && now - prev.t < 900 && movedM < 10) return;
      lastGpsEmitRef.current = { t: now, ...loc };
      setUserPos(loc);
      setGpsStatus("found");
      setOriginLoc((prevLoc) => {
        if (prevLoc === null) {
          if (!seededOriginQueryRef.current) {
            seededOriginQueryRef.current = true;
            setOriginQuery("Your location");
          }
          return { display_name: "Your location", ...loc };
        }
        if (prevLoc.display_name === "Your location") return { ...prevLoc, ...loc };
        return prevLoc;
      });
      onUserLocationRef.current?.(loc.lat, loc.lng);
      const d = destLocRef.current;
      onPreviewPinsRef.current?.(loc, d ? { lat: d.lat, lng: d.lng } : null);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => emit({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        navigator.geolocation.clearWatch(watchId);
        setGpsStatus("denied");
        const fb = { lat: 39.9526, lng: -75.1652 };
        setOriginLoc({ display_name: "Philadelphia Center", ...fb });
        setOriginQuery("Philadelphia Center");
        onPreviewPinsRef.current?.(fb, null);
        onUserLocationRef.current?.(fb.lat, fb.lng);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const openDirections = useCallback(
    (destName?: string, destCoords?: { lat: number; lng: number }) => {
      setView("directions");
      if (destName && destCoords) {
        setDestQuery(destName);
        setDestLoc({ display_name: destName, ...destCoords });
        onPreviewPins?.(originLoc, destCoords);
      }
    },
    [originLoc, onPreviewPins]
  );

  const startTrip = useCallback(async () => {
    if (!originLoc || !destLoc) return;
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

    const directRoute = await getMultiStopRoute(ORS_API_KEY, activeMode, waypoints);
    if (!directRoute) return;

    let routeData: RouteData;
    let meta: { distanceKm: number; durationMin: number; isSafe: boolean; nearbyCount: number };

    if (safety.nearbyCount === 0) {
      routeData = { normal: directRoute, safe: null, avoidZones: [] };
      meta = { distanceKm: directRoute.distanceKm, durationMin: directRoute.durationMin, isSafe: false, nearbyCount: 0 };
    } else {
      const zones = buildAvoidZones(incSnap);
      const safeRoute = await getMultiStopRoute(ORS_API_KEY, activeMode, waypoints, buildAvoidPolygons(zones));
      const best = safeRoute || directRoute;
      routeData = { normal: directRoute, safe: safeRoute, avoidZones: zones };
      meta = { distanceKm: best.distanceKm, durationMin: best.durationMin, isSafe: !!safeRoute, nearbyCount: safety.nearbyCount };
    }

    onRoutesChange(routeData);
    setRouteInfo({
      isSafe: meta.isSafe,
      distanceKm: meta.distanceKm,
      durationMin: meta.durationMin,
      nearbyCount: safety.nearbyCount,
    });
    setView("trip");
    const geom = (routeData.safe || routeData.normal)?.geometry;
    onTripActive?.(true, geom, activeMode);
  }, [originLoc, destLoc, stops, activeMode, onRoutesChange, onTripActive]);

  const resetTrip = useCallback(() => {
    setDemoRouteSim(false);
    setRouteInfo(null);
    setDestLoc(null);
    setDestQuery("");
    setStops([]);
    setView("search");
    onRoutesChange(null);
    onTripActive?.(false);
    onPreviewPins?.(originLoc, null);
    onPreviewWaypoints?.(null);
    onRouteDemoSimChange?.(false);
  }, [onRoutesChange, onTripActive, onPreviewPins, onPreviewWaypoints, originLoc, onRouteDemoSimChange]);

  const highCount = incidents.filter((i) => i.s_base >= 0.7).length;

  return (
    <div className="absolute top-0 left-0 bottom-0 z-[1000] flex pointer-events-none">
      <div
        className="w-[380px] h-full flex flex-col pointer-events-auto backdrop-blur-xl shadow-2xl
                   max-md:fixed max-md:inset-0 max-md:w-full max-md:z-[2000]"
        style={{
          background: "var(--panel-bg)",
          borderRight: "1px solid var(--panel-border)",
          boxShadow: "4px 0 24px var(--panel-shadow)",
        }}
      >
        {view === "search" && (
          <>
            <SearchInput onFlyTo={onFlyTo} onDirections={openDirections} />

            <button
              onClick={() => openDirections()}
              className="mx-4 mb-2 w-[calc(100%-2rem)] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 transition-all text-sm text-blue-500 font-medium"
            >
              <Navigation className="w-4 h-4" />
              Get Safe Directions
            </button>

            <SavedPlaces onFlyTo={onFlyTo} onDirections={openDirections} />

            {/* Stats strip */}
            <div
              className="px-4 py-3 space-y-3"
              style={{ borderBottom: "1px solid var(--panel-border)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] text-green-500 font-medium">LIVE</span>
                  <span className="text-[11px]" style={{ color: "var(--panel-text-muted)" }}>·</span>
                  <span className="text-[11px] font-semibold" style={{ color: "var(--panel-text)" }}>
                    {incidents.length}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--panel-text-secondary)" }}>
                    incidents
                  </span>
                </div>
                {trendPct !== 0 && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    trendPct > 0 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                  }`}>
                    {trendPct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {trendPct > 0 ? "+" : ""}{trendPct}%
                  </div>
                )}
                {trendPct === 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: "var(--panel-input-bg)", color: "var(--panel-text-muted)" }}>
                    <Minus className="w-3 h-3" />
                    0%
                  </div>
                )}
              </div>
              {highCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-medium">{highCount} critical</span>
                </div>
              )}

              {/* Today's hourly sparkline */}
              {hourlyData.length > 0 && hourlyData.some((v) => v > 0) && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--panel-text-muted)" }}>
                    Today&apos;s Activity
                  </p>
                  <Sparkline data={hourlyData} color="#3b82f6" width={340} height={28} filled />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px]" style={{ color: "var(--panel-text-muted)" }}>12am</span>
                    <span className="text-[8px]" style={{ color: "var(--panel-text-muted)" }}>6am</span>
                    <span className="text-[8px]" style={{ color: "var(--panel-text-muted)" }}>12pm</span>
                    <span className="text-[8px]" style={{ color: "var(--panel-text-muted)" }}>6pm</span>
                    <span className="text-[8px]" style={{ color: "var(--panel-text-muted)" }}>12am</span>
                  </div>
                </div>
              )}

              {/* Category breakdown bar */}
              {categoryBreakdown.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--panel-text-muted)" }}>
                    By Category
                  </p>
                  <div className="flex h-2 rounded-full overflow-hidden gap-px">
                    {categoryBreakdown.map((cat) => (
                      <div
                        key={cat.label}
                        className="h-full cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: cat.color,
                          flexGrow: cat.count,
                        }}
                        title={`${cat.label}: ${cat.count}`}
                        onClick={() => onToggleCat?.(cat.cats)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {categoryBreakdown.map((cat) => (
                      <button
                        key={cat.label}
                        className="flex items-center gap-1 text-[9px] transition-opacity hover:opacity-80"
                        style={{ color: "var(--panel-text-secondary)" }}
                        onClick={() => onToggleCat?.(cat.cats)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        {cat.label}
                        <span className="font-mono" style={{ color: "var(--panel-text-muted)" }}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hot neighborhoods */}
              {hotNeighborhoods.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--panel-text-muted)" }}>
                    Hot Spots
                  </p>
                  <div className="space-y-1">
                    {hotNeighborhoods.map((n, idx) => (
                      <div key={n.slug} className="flex items-center gap-2">
                        <span className="text-[9px] font-mono w-3 text-right" style={{ color: "var(--panel-text-muted)" }}>{idx + 1}</span>
                        <MapPin className="w-3 h-3 shrink-0" style={{ color: idx === 0 ? "#ef4444" : idx < 3 ? "#f59e0b" : "var(--panel-text-muted)" }} />
                        <span className="text-[10px] flex-1 truncate" style={{ color: "var(--panel-text-secondary)" }}>{n.name}</span>
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel-input-bg)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (n.count / (hotNeighborhoods[0]?.count || 1)) * 100)}%`,
                              backgroundColor: idx === 0 ? "#ef4444" : idx < 3 ? "#f59e0b" : "#3b82f6",
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-mono w-4 text-right" style={{ color: "var(--panel-text-muted)" }}>{n.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-2">
                <h3
                  className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "var(--panel-text-muted)" }}
                >
                  <Radio className="w-3 h-3" /> {timeFilterLabel ? `Incidents — ${timeFilterLabel}` : "Recent Incidents"}
                </h3>
              </div>
              <IncidentFeed
                incidents={incidents}
                selectedId={selectedId ?? null}
                onSelect={(id) => {
                  onSelectIncident?.(id);
                  const inc = incidents.find((i) => i.id === id);
                  if (inc?.lat && inc?.lng) onFlyTo(inc.lat, inc.lng);
                }}
              />
            </div>

            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderTop: "1px solid var(--panel-border)" }}
            >
              <Shield className="w-4 h-4 text-blue-500/60" />
              <span className="text-[11px]" style={{ color: "var(--panel-text-muted)" }}>
                PHLPulse · AI-Powered Community Safety
              </span>
            </div>
          </>
        )}

        {view === "directions" && (
          <DirectionsPanel
            incidents={incidents}
            originLoc={originLoc}
            setOriginLoc={setOriginLoc}
            originQuery={originQuery}
            setOriginQuery={setOriginQuery}
            destLoc={destLoc}
            setDestLoc={setDestLoc}
            destQuery={destQuery}
            setDestQuery={setDestQuery}
            stops={stops}
            setStops={setStops}
            activeMode={activeMode}
            setActiveMode={setActiveMode}
            userPos={userPos}
            gpsStatus={gpsStatus}
            onBack={() => {
              setView("search");
              setDestLoc(null);
              setDestQuery("");
              setStops([]);
              onRoutesChange(null);
              onPreviewPins?.(originLoc, null);
              onPreviewWaypoints?.(null);
            }}
            onFlyTo={onFlyTo}
            onRoutesChange={onRoutesChange}
            onPreviewPins={onPreviewPins}
            onPreviewWaypoints={onPreviewWaypoints}
            onStartTrip={startTrip}
            routeGeometryForDemo={routeGeometryForDemo}
            demoRouteSim={demoRouteSim}
            onDemoRouteSimChange={setDemoRouteSim}
          />
        )}

        {view === "trip" && routeInfo && (
          <TripHUD
            routeInfo={routeInfo}
            originQuery={originQuery}
            destQuery={destQuery}
            stops={stops}
            activeMode={activeMode}
            tripProgress={tripProgress}
            routeGeometryForDemo={routeGeometryForDemo}
            demoRouteSim={demoRouteSim}
            onDemoRouteSimChange={setDemoRouteSim}
            onResetTrip={resetTrip}
            recentIncidents={incidents.slice(0, 12)}
            onSelectIncident={(id) => onSelectIncident?.(id)}
            onFlyTo={onFlyTo}
          />
        )}
      </div>
    </div>
  );
}
