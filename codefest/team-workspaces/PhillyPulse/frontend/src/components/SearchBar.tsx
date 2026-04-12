"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  MapPin,
  Footprints,
  Bike,
  Car,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  LocateFixed,
  CheckCircle2,
  X,
  ArrowUpDown,
  ChevronLeft,
  Shield,
  Play,
  RotateCcw,
  Radio,
  Flame,
  Clock,
  Route,
  Star,
  Trash2,
  Plus,
} from "lucide-react";
import { geocodePhilly, assessSafety } from "@/lib/search";
import { useSavedDestinations } from "@/hooks/useSavedDestinations";
import {
  getRoute,
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

const ORS_API_KEY =
  process.env.NEXT_PUBLIC_ORS_KEY || "5b3ce3597851110001cf6248a1b2c3d4e5f6a7b8";

/** Great-circle distance in meters (for GPS throttle). */
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

const MODES: { id: TransportMode; label: string; icon: typeof Footprints }[] = [
  { id: "foot-walking", label: "Walking", icon: Footprints },
  { id: "cycling-regular", label: "Cycling", icon: Bike },
  { id: "driving-car", label: "Driving", icon: Car },
];

type View = "search" | "directions" | "trip";

const STOP_COLORS = ["#f97316", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];

interface StopLoc {
  display_name: string;
  lat: number;
  lng: number;
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
  /** Active route polyline for demo simulation (directions + trip). */
  routeGeometryForDemo?: [number, number][] | null;
  /** When true, map uses simulated movement so live trip can be tested without walking. */
  onRouteDemoSimChange?: (active: boolean) => void;
}

export default function SearchBar({
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
}: Props) {
  const [view, setView] = useState<View>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<
    { display_name: string; lat: number; lng: number }[]
  >([]);
  const [originSuggestions, setOriginSuggestions] = useState<
    { display_name: string; lat: number; lng: number }[]
  >([]);
  const [destSuggestions, setDestSuggestions] = useState<
    { display_name: string; lat: number; lng: number }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [originLoading, setOriginLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"search" | "origin" | "dest" | null>(null);
  const [originLoc, setOriginLoc] = useState<{ display_name: string; lat: number; lng: number } | null>(null);
  const [destLoc, setDestLoc] = useState<{ display_name: string; lat: number; lng: number } | null>(null);
  const [stops, setStops] = useState<{ query: string; loc: StopLoc | null }[]>([]);
  const [stopSuggestions, setStopSuggestions] = useState<{ display_name: string; lat: number; lng: number }[]>([]);
  const [stopLoading, setStopLoading] = useState(false);
  const [activeStopIdx, setActiveStopIdx] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<TransportMode>("driving-car");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    isSafe: boolean;
    distanceKm: number;
    durationMin: number;
    directDurationMin?: number;
    timeSaved?: number;
    nearbyCount: number;
  } | null>(null);
  const [previewRoute, setPreviewRoute] = useState<{
    distanceKm: number;
    durationMin: number;
    isSafe: boolean;
    nearbyCount: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [startNavBusy, setStartNavBusy] = useState(false);
  const [demoRouteSim, setDemoRouteSim] = useState(false);
  const demoRouteSimRef = useRef(false);
  const demoDistMRef = useRef(0);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "found" | "denied">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewAbortRef = useRef<AbortController | null>(null);
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
  const { destinations: savedDests, canSave, addDestination, removeDestination } = useSavedDestinations();

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

  // ~100 m/min along the active route (for testing live vehicle / GPS UI)
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
      setOriginLoc((prevLoc) => {
        if (prevLoc?.display_name === "Your location") {
          return { ...prevLoc, ...loc };
        }
        return prevLoc;
      });
      onUserLocationRef.current?.(loc.lat, loc.lng);
      const d = destLocRef.current;
      onPreviewPinsRef.current?.(
        loc,
        d ? { lat: d.lat, lng: d.lng } : null
      );
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

  // Live GPS: watchPosition + throttle so we don't spam routing APIs on every tick.
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
        if (prevLoc.display_name === "Your location") {
          return { ...prevLoc, ...loc };
        }
        return prevLoc;
      });

      onUserLocationRef.current?.(loc.lat, loc.lng);
      const d = destLocRef.current;
      onPreviewPinsRef.current?.(
        loc,
        d ? { lat: d.lat, lng: d.lng } : null
      );
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        emit({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
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

  const geocode = useCallback(async (
    q: string,
    setter: (r: { display_name: string; lat: number; lng: number }[]) => void,
    loadingSetter: (b: boolean) => void,
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setter([]); loadingSetter(false); return; }
    loadingSetter(true);
    debounceRef.current = setTimeout(async () => {
      const results = await geocodePhilly(q);
      setter(results);
      loadingSetter(false);
    }, 200);
  }, []);

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
        color: i === 0 ? "#22c55e" : i === wps.length - 1 ? "#ef4444" : STOP_COLORS[(i - 1) % STOP_COLORS.length],
        glowColor: i === 0 ? "rgba(34,197,94,0.5)" : i === wps.length - 1 ? "rgba(239,68,68,0.5)" : STOP_COLORS[(i - 1) % STOP_COLORS.length] + "80",
      }));
      onPreviewWaypoints?.(pins);
    } else {
      onPreviewWaypoints?.(null);
    }
  }, [allWaypoints, onPreviewWaypoints]);

  useEffect(() => {
    if (view === "directions") syncPreviewPins();
  }, [originLoc, destLoc, stops, view, syncPreviewPins]);

  // Auto-fetch route preview when waypoints change
  useEffect(() => {
    if (!originLoc || !destLoc || view === "trip") {
      setPreviewRoute(null);
      return;
    }
    // Blank "Add stop" rows (no query yet) must not block routing
    const intermediateReady = stops.every(
      (s) => s.query.trim() === "" || s.loc !== null
    );
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
          setRouteError(
            "Could not load a street route. Check your network or try another mode."
          );
          return;
        }

        if (safety.nearbyCount === 0) {
          onRoutesChange({ normal: directRoute, safe: null, avoidZones: [] });
          setPreviewRoute({ distanceKm: directRoute.distanceKm, durationMin: directRoute.durationMin, isSafe: false, nearbyCount: 0 });
        } else {
          const zones = buildAvoidZones(incSnap);
          const safeRoute = await getMultiStopRoute(ORS_API_KEY, activeMode, waypoints, buildAvoidPolygons(zones));
          if (controller.signal.aborted) return;
          const best = safeRoute || directRoute;
          onRoutesChange({ normal: directRoute, safe: safeRoute, avoidZones: zones });
          setPreviewRoute({ distanceKm: best.distanceKm, durationMin: best.durationMin, isSafe: !!safeRoute, nearbyCount: safety.nearbyCount });
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
  }, [originLoc, destLoc, stops, activeMode, view, onRoutesChange]);

  const openDirections = useCallback((destName?: string, destCoords?: { lat: number; lng: number }) => {
    setView("directions");
    if (destName && destCoords) {
      setDestQuery(destName);
      setDestLoc({ display_name: destName, ...destCoords });
      onPreviewPins?.(originLoc, destCoords);
    }
    setSearchSuggestions([]);
    setSearchQuery("");
  }, [originLoc, onPreviewPins]);

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

    setStartNavBusy(true);
    setRouteError(null);

    try {
      let directRoute = await getMultiStopRoute(ORS_API_KEY, activeMode, waypoints);
      if (!directRoute) {
        setRouteError(
          "Could not calculate route. Check your connection or try again."
        );
        return;
      }

      let routeData: RouteData;
      let meta: {
        distanceKm: number;
        durationMin: number;
        isSafe: boolean;
        nearbyCount: number;
      };

      if (safety.nearbyCount === 0) {
        routeData = { normal: directRoute, safe: null, avoidZones: [] };
        meta = {
          distanceKm: directRoute.distanceKm,
          durationMin: directRoute.durationMin,
          isSafe: false,
          nearbyCount: 0,
        };
      } else {
        const zones = buildAvoidZones(incSnap);
        const safeRoute = await getMultiStopRoute(
          ORS_API_KEY,
          activeMode,
          waypoints,
          buildAvoidPolygons(zones)
        );
        const best = safeRoute || directRoute;
        routeData = { normal: directRoute, safe: safeRoute, avoidZones: zones };
        meta = {
          distanceKm: best.distanceKm,
          durationMin: best.durationMin,
          isSafe: !!safeRoute,
          nearbyCount: safety.nearbyCount,
        };
      }

      onRoutesChange(routeData);
      setPreviewRoute(meta);
      setRouteInfo({
        isSafe: meta.isSafe,
        distanceKm: meta.distanceKm,
        durationMin: meta.durationMin,
        nearbyCount: safety.nearbyCount,
      });
      setView("trip");

      const geom = (routeData.safe || routeData.normal)?.geometry;
      onTripActive?.(true, geom, activeMode);
    } catch {
      setRouteError("Start navigation failed. Check your connection and API.");
    } finally {
      setStartNavBusy(false);
    }
  }, [originLoc, destLoc, stops, activeMode, onRoutesChange, onTripActive]);

  const resetTrip = useCallback(() => {
    setDemoRouteSim(false);
    setRouteInfo(null);
    setPreviewRoute(null);
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

  const swapLocations = () => {
    const tmpQ = originQuery; const tmpL = originLoc;
    setOriginQuery(destQuery); setOriginLoc(destLoc);
    setDestQuery(tmpQ); setDestLoc(tmpL);
    onPreviewPins?.(destLoc, tmpL);
  };

  const recentIncidents = incidents.slice(0, 12);
  const highCount = incidents.filter(i => i.s_base >= 0.7).length;

  const renderSuggestion = (s: { display_name: string; lat: number; lng: number }, i: number, onSelect: () => void, showDirections?: boolean) => {
    const parts = s.display_name.split(",");
    const primary = parts[0].trim();
    const secondary = parts.slice(1, 3).map(p => p.trim()).join(", ");
    return (
      <div
        key={i}
        onClick={onSelect}
        className="w-full text-left px-4 py-3 flex items-start gap-3 last:border-0 transition-colors cursor-pointer"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--panel-input-bg)" }}>
          <MapPin className="w-4 h-4" style={{ color: "var(--panel-text-muted)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: "var(--panel-text)" }}>{primary}</p>
          {secondary && <p className="text-xs truncate mt-0.5" style={{ color: "var(--panel-text-muted)" }}>{secondary}</p>}
        </div>
        {showDirections && (
          <button
            onClick={(e) => { e.stopPropagation(); openDirections(primary, s); }}
            className="ml-auto text-blue-500/50 hover:text-blue-500 shrink-0 mt-1"
            title="Get directions"
          >
            <Navigation className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const renderLoadingDropdown = () => (
    <div className="px-4 py-3 flex items-center gap-3">
      <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--panel-text-muted)" }} />
      <span className="text-xs" style={{ color: "var(--panel-text-muted)" }}>Searching...</span>
    </div>
  );

  return (
    <div className="absolute top-0 left-0 bottom-0 z-[1000] flex pointer-events-none">
      <div
        className="w-[380px] h-full flex flex-col pointer-events-auto backdrop-blur-xl shadow-2xl"
        style={{
          background: "var(--panel-bg)",
          borderRight: "1px solid var(--panel-border)",
          boxShadow: `4px 0 24px var(--panel-shadow)`,
        }}
      >

        {/* === SEARCH VIEW === */}
        {view === "search" && (
          <>
            <div className="p-4 pb-2">
              <div
                className="flex items-center gap-3 rounded-full px-4 py-2.5 transition-colors shadow-lg"
                style={{
                  background: "var(--panel-input-bg)",
                  border: "1px solid var(--panel-input-border)",
                  boxShadow: "0 2px 8px var(--panel-shadow)",
                }}
              >
                <Search className="w-5 h-5 text-blue-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setActiveDropdown("search"); geocode(e.target.value, setSearchSuggestions, setSearchLoading); }}
                  onFocus={() => { if (searchQuery.length >= 2) setActiveDropdown("search"); }}
                  placeholder="Search PHLPulse"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--panel-text)" }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchSuggestions([]); setActiveDropdown(null); }} style={{ color: "var(--panel-text-muted)" }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => openDirections()}
                className="mt-3 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 transition-all text-sm text-blue-500 font-medium"
              >
                <Navigation className="w-4 h-4" />
                Get Safe Directions
              </button>
            </div>

            {/* Search suggestions dropdown */}
            {activeDropdown === "search" && (searchSuggestions.length > 0 || searchLoading) && (
              <div
                className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg"
                style={{ background: "var(--panel-bg-secondary)", border: "1px solid var(--panel-border)" }}
              >
                {searchLoading && searchSuggestions.length === 0 && renderLoadingDropdown()}
                {searchSuggestions.map((s, i) =>
                  renderSuggestion(s, i, () => {
                    onFlyTo(s.lat, s.lng);
                    setSearchQuery(s.display_name.split(",")[0]);
                    setSearchSuggestions([]);
                    setActiveDropdown(null);
                  }, true)
                )}
              </div>
            )}

            {/* Saved destinations */}
            {canSave && savedDests.length > 0 && activeDropdown !== "search" && (
              <div className="px-4 pb-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5" style={{ color: "var(--panel-text-muted)" }}>
                  <Star className="w-3 h-3" /> Saved Places
                </h3>
                <div className="space-y-1">
                  {savedDests.map((dest) => (
                    <div
                      key={dest.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer group"
                      style={{ background: "var(--panel-input-bg)" }}
                      onClick={() => { onFlyTo(dest.lat, dest.lng); }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "var(--panel-input-bg)"}
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500" />
                      <span className="text-xs truncate flex-1" style={{ color: "var(--panel-text)" }}>{dest.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDirections(dest.name, { lat: dest.lat, lng: dest.lng }); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500/50 hover:text-blue-500 shrink-0"
                        title="Get directions"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void removeDestination(dest.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        style={{ color: "var(--panel-text-muted)" }}
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live status */}
            <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--panel-border)" }}>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] text-green-500 font-medium">LIVE</span>
              <span className="text-[11px]" style={{ color: "var(--panel-text-muted)" }}>·</span>
              <span className="text-[11px]" style={{ color: "var(--panel-text-secondary)" }}>{incidents.length} incidents tracked</span>
              {highCount > 0 && (
                <>
                  <span className="text-[11px]" style={{ color: "var(--panel-text-muted)" }}>·</span>
                  <span className="text-[11px] text-amber-500 flex items-center gap-1"><Flame className="w-3 h-3" />{highCount} critical</span>
                </>
              )}
            </div>

            {/* Incident feed */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--panel-text-muted)" }}>
                  <Radio className="w-3 h-3" /> Recent Incidents
                </h3>
              </div>
              {recentIncidents.map((inc) => {
                const sev = getSeverity(inc.severity_category);
                const isSelected = selectedId === inc.id;
                return (
                  <div
                    key={inc.id}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${isSelected ? "bg-blue-500/10" : ""}`}
                    style={{ borderBottom: "1px solid var(--panel-border)" }}
                    onClick={() => { onSelectIncident?.(inc.id); onFlyTo(inc.lat!, inc.lng!); }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--panel-hover)"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="w-3 h-3 rounded-full mt-1 shrink-0 ring-2" style={{ backgroundColor: sev.markerColor, ["--tw-ring-color" as string]: sev.markerColor + "40" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate" style={{ color: "var(--panel-text)" }}>{inc.location_text || "Unknown location"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "var(--panel-text-secondary)" }}>{sev.label}</span>
                        <span className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>·</span>
                        <span className="text-[10px]" style={{ color: "var(--panel-text-secondary)" }}>
                          {new Date(inc.reported_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (inc.lat && inc.lng) openDirections(inc.location_text?.split(",")[0], { lat: inc.lat, lng: inc.lng }); }}
                      className="hover:text-blue-500 shrink-0"
                      style={{ color: "var(--panel-text-muted)" }}
                      title="Directions to here"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {recentIncidents.length === 0 && (
                <div className="px-4 py-8 text-center text-xs" style={{ color: "var(--panel-text-muted)" }}>
                  No incidents yet. Listening for scanner activity...
                </div>
              )}
            </div>

            <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--panel-border)" }}>
              <Shield className="w-4 h-4 text-blue-500/60" />
              <span className="text-[11px]" style={{ color: "var(--panel-text-muted)" }}>PHLPulse · AI-Powered Community Safety</span>
            </div>
          </>
        )}

        {/* === DIRECTIONS VIEW === */}
        {view === "directions" && (
          <>
            <div className="flex items-center gap-2 px-3 py-3" style={{ borderBottom: "1px solid var(--panel-border)" }}>
              <button
                onClick={() => { setView("search"); setDestLoc(null); setDestQuery(""); setStops([]); setPreviewRoute(null); onRoutesChange(null); onPreviewPins?.(originLoc, null); onPreviewWaypoints?.(null); }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--panel-text-secondary)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium" style={{ color: "var(--panel-text)" }}>Directions</span>
            </div>

            {/* Transport mode tabs */}
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

            {/* Waypoint inputs (A → B → C → ...) */}
            <div className="p-4">
              <div className="flex gap-2">
                <div className="flex flex-col items-center pt-3 gap-0">
                  <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-500/20" />
                  {stops.map((_, i) => (
                    <div key={`dot-${i}`} className="contents">
                      <div className="w-0.5 flex-1 my-1" style={{ background: "var(--panel-border)" }} />
                      <div className="w-3 h-3 rounded-full ring-4" style={{ backgroundColor: STOP_COLORS[i % STOP_COLORS.length], ["--tw-ring-color" as string]: STOP_COLORS[i % STOP_COLORS.length] + "30" }} />
                    </div>
                  ))}
                  <div className="w-0.5 flex-1 my-1" style={{ background: "var(--panel-border)" }} />
                  <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-500/20" />
                </div>

                <div className="flex-1 space-y-2">
                  {/* Origin */}
                  <div className="relative">
                    <input
                      type="text"
                      value={originQuery}
                      onChange={(e) => { setOriginQuery(e.target.value); setOriginLoc(null); setActiveDropdown("origin"); geocode(e.target.value, setOriginSuggestions, setOriginLoading); }}
                      onFocus={() => { setActiveDropdown("origin"); if (originQuery.length >= 2 && !originLoc) geocode(originQuery, setOriginSuggestions, setOriginLoading); }}
                      placeholder="A · Starting point"
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500/30"
                      style={{ background: "var(--panel-input-bg)", border: "1px solid var(--panel-input-border)", color: "var(--panel-text)" }}
                    />
                    {originLoc && (
                      <button onClick={() => { setOriginLoc(null); setOriginQuery(""); setPreviewRoute(null); onRoutesChange(null); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full" style={{ color: "var(--panel-text-muted)" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!originLoc && gpsStatus === "found" && (
                      <button onClick={() => { setOriginLoc({ display_name: "Your location", ...userPos! }); setOriginQuery("Your location"); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-blue-500/50 hover:text-blue-500" title="Use my location">
                        <LocateFixed className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Intermediate stops */}
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
                          if (stop.query.length >= 2 && !stop.loc) geocode(stop.query, setStopSuggestions, setStopLoading);
                        }}
                        placeholder={`${String.fromCharCode(66 + idx)} · Stop`}
                        className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500/30"
                        style={{ background: "var(--panel-input-bg)", border: "1px solid var(--panel-input-border)", color: "var(--panel-text)" }}
                      />
                      <button
                        onClick={() => {
                          setStops(stops.filter((_, i) => i !== idx));
                          setPreviewRoute(null);
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

                  {/* Destination */}
                  <div className="relative">
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => { setDestQuery(e.target.value); setDestLoc(null); setActiveDropdown("dest"); geocode(e.target.value, setDestSuggestions, setDestLoading); }}
                      onFocus={() => { setActiveDropdown("dest"); if (destQuery.length >= 2 && !destLoc) geocode(destQuery, setDestSuggestions, setDestLoading); }}
                      placeholder={`${String.fromCharCode(66 + stops.length)} · Destination`}
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500/30"
                      style={{ background: "var(--panel-input-bg)", border: "1px solid var(--panel-input-border)", color: "var(--panel-text)" }}
                      autoFocus={!destLoc}
                    />
                    {destLoc && (
                      <button onClick={() => { setDestLoc(null); setDestQuery(""); setPreviewRoute(null); setRouteError(null); onRoutesChange(null); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full" style={{ color: "var(--panel-text-muted)" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <button onClick={swapLocations} className="self-start mt-3 p-2 rounded-full transition-colors" style={{ color: "var(--panel-text-muted)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* Add stop button */}
              {stops.length < 5 && (
                <button
                  onClick={() => setStops([...stops, { query: "", loc: null }])}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors rounded-lg"
                  style={{ color: "var(--panel-text-secondary)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <Plus className="w-3.5 h-3.5" /> Add stop
                </button>
              )}

              {/* Route preview info (shown automatically when both locations selected) */}
              {previewLoading && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: "var(--panel-input-bg)" }}>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>Calculating route...</span>
                </div>
              )}

              {routeError && !previewLoading && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-red-400" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{routeError}</span>
                </div>
              )}

              {previewRoute && !previewLoading && (
                <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid var(--panel-border)" }}>
                  {/* Blue route summary bar */}
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-500/10">
                    <Route className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-bold text-blue-500">{Math.ceil(previewRoute.durationMin)} min</span>
                      <span className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>{previewRoute.distanceKm.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: "var(--panel-text-muted)" }}>
                      <Clock className="w-3 h-3" />
                      {MODES.find(m => m.id === activeMode)?.label}
                    </div>
                  </div>
                  {/* Safety status */}
                  {previewRoute.nearbyCount > 0 && previewRoute.isSafe && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-600 dark:text-green-400/80 bg-green-500/5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      Safe route avoiding {previewRoute.nearbyCount} incident{previewRoute.nearbyCount > 1 ? "s" : ""}
                    </div>
                  )}
                  {previewRoute.nearbyCount > 0 && !previewRoute.isSafe && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400/80 bg-amber-500/5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {previewRoute.nearbyCount} incident{previewRoute.nearbyCount > 1 ? "s" : ""} near route
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

              {routeGeometryForDemo && routeGeometryForDemo.length >= 2 && (
                <label className="mt-3 flex items-start gap-2.5 cursor-pointer text-xs px-1 leading-snug" style={{ color: "var(--panel-text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={demoRouteSim}
                    onChange={(e) => setDemoRouteSim(e.target.checked)}
                    className="mt-0.5 rounded border-gray-500 accent-blue-500"
                  />
                  <span>
                    Demo: simulate walking speed (~100&nbsp;m per minute) along the route to test the live icon.
                  </span>
                </label>
              )}

              {/* GO button */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void startTrip()}
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
                  {startNavBusy ? "Starting…" : "Start Navigation"}
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
                      background: savedDests.some(d => Math.abs(d.lat - destLoc.lat) < 0.0001 && Math.abs(d.lng - destLoc.lng) < 0.0001)
                        ? "rgba(245,158,11,0.15)"
                        : "var(--panel-input-bg)",
                      borderColor: savedDests.some(d => Math.abs(d.lat - destLoc.lat) < 0.0001 && Math.abs(d.lng - destLoc.lng) < 0.0001)
                        ? "rgba(245,158,11,0.3)"
                        : "var(--panel-border)",
                    }}
                    title={savedDests.some(d => Math.abs(d.lat - destLoc.lat) < 0.0001 && Math.abs(d.lng - destLoc.lng) < 0.0001)
                      ? "Saved"
                      : "Save destination"}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        savedDests.some(d => Math.abs(d.lat - destLoc.lat) < 0.0001 && Math.abs(d.lng - destLoc.lng) < 0.0001)
                          ? "text-amber-500 fill-amber-500"
                          : ""
                      }`}
                      style={
                        !savedDests.some(d => Math.abs(d.lat - destLoc.lat) < 0.0001 && Math.abs(d.lng - destLoc.lng) < 0.0001)
                          ? { color: "var(--panel-text-muted)" }
                          : {}
                      }
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Origin suggestions dropdown */}
            {activeDropdown === "origin" && !originLoc && (originSuggestions.length > 0 || originLoading) && (
              <div className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg max-h-[240px] overflow-y-auto"
                style={{ background: "var(--panel-bg-secondary)", border: "1px solid var(--panel-border)" }}>
                {originLoading && originSuggestions.length === 0 && renderLoadingDropdown()}
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

            {/* Dest suggestions dropdown */}
            {activeDropdown === "dest" && !destLoc && (destSuggestions.length > 0 || destLoading) && (
              <div className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg max-h-[240px] overflow-y-auto"
                style={{ background: "var(--panel-bg-secondary)", border: "1px solid var(--panel-border)" }}>
                {destLoading && destSuggestions.length === 0 && renderLoadingDropdown()}
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

            {/* Stop suggestions dropdown */}
            {activeStopIdx !== null && stops[activeStopIdx] && !stops[activeStopIdx].loc && (stopSuggestions.length > 0 || stopLoading) && (
              <div className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg max-h-[240px] overflow-y-auto"
                style={{ background: "var(--panel-bg-secondary)", border: "1px solid var(--panel-border)" }}>
                {stopLoading && stopSuggestions.length === 0 && renderLoadingDropdown()}
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
        )}

        {/* === TRIP ACTIVE VIEW === */}
        {view === "trip" && routeInfo && (
          <>
            <div className={`p-4 ${routeInfo.isSafe ? "bg-green-500/10" : "bg-blue-500/10"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {routeInfo.isSafe ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <Navigation className="w-5 h-5 text-blue-500" />}
                  <span className={`text-sm font-semibold ${routeInfo.isSafe ? "text-green-500" : "text-blue-500"}`}>
                    {routeInfo.isSafe ? "Safe Route Active" : "Navigation Active"}
                  </span>
                </div>
                <button onClick={resetTrip} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors"
                  style={{ color: "var(--panel-text-secondary)", background: "var(--panel-input-bg)" }}>
                  <RotateCcw className="w-3 h-3" /> End
                </button>
              </div>

              {/* Live distance & time with progress */}
              <div className="flex gap-6 items-end">
                <div>
                  <p className="text-2xl font-bold" style={{ color: "var(--panel-text)" }}>
                    {Math.max(0, Math.ceil(routeInfo.durationMin * (1 - tripProgress)))} min
                  </p>
                  <p className="text-xs" style={{ color: "var(--panel-text-secondary)" }}>
                    {Math.max(0, (routeInfo.distanceKm * (1 - tripProgress))).toFixed(1)} km remaining
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--panel-text-secondary)" }}>
                  {(() => { const M = MODES.find(m => m.id === activeMode); return M ? <M.icon className="w-4 h-4" /> : null; })()}
                  {MODES.find(m => m.id === activeMode)?.label}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--panel-input-bg)" }}>
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
                <div className="flex justify-between text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
                  <span>{(routeInfo.distanceKm * tripProgress).toFixed(1)} km traveled</span>
                  <span>{Math.round(tripProgress * 100)}%</span>
                </div>
              </div>

              {routeGeometryForDemo && routeGeometryForDemo.length >= 2 && (
                <label className="mt-3 flex items-start gap-2.5 cursor-pointer text-xs leading-snug" style={{ color: "var(--panel-text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={demoRouteSim}
                    onChange={(e) => setDemoRouteSim(e.target.checked)}
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
                  {routeInfo.nearbyCount} incident{routeInfo.nearbyCount > 1 ? "s" : ""} near route — proceed with caution
                </div>
              )}
            </div>

            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--panel-border)" }}>
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--panel-text-secondary)" }}>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="truncate">{originQuery}</span>
              </div>
              {stops.map((stop, idx) => (
                <div key={idx}>
                  <div className="ml-1 w-px h-3" style={{ background: "var(--panel-border)" }} />
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--panel-text-secondary)" }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STOP_COLORS[idx % STOP_COLORS.length] }} />
                    <span className="truncate">{stop.query}</span>
                  </div>
                </div>
              ))}
              <div className="ml-1 w-px h-3" style={{ background: "var(--panel-border)" }} />
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--panel-text-secondary)" }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="truncate">{destQuery}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--panel-text-muted)" }}>Incidents Near Route</h3>
              </div>
              {recentIncidents.filter(inc => inc.lat && inc.lng).slice(0, 8).map((inc) => {
                const sev = getSeverity(inc.severity_category);
                return (
                  <button key={inc.id} onClick={() => { onSelectIncident?.(inc.id); onFlyTo(inc.lat!, inc.lng!); }}
                    className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
                    style={{ borderBottom: "1px solid var(--panel-border)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: sev.markerColor }} />
                    <div className="min-w-0">
                      <p className="text-xs truncate" style={{ color: "var(--panel-text-secondary)" }}>{inc.location_text || "Unknown"}</p>
                      <p className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>{sev.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
