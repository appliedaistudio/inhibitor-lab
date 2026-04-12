"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  Eye,
  X,
  Layers,
  Flame,
  Siren,
  HeartPulse,
  Car,
  Volume2,
  Clock,
  Sun,
  Moon,
  Monitor,
  BarChart3,
  Menu,
  LocateFixed,
  House,
  TrendingUp,
  TrendingDown,
  MapPin,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SearchSidebar from "@/components/SearchSidebar";
import { type RouteData } from "@/components/RoutePanel";
import SafetyScoreCard from "@/components/SafetyScoreCard";
import AlertToast from "@/components/AlertToast";
import IncidentDetail from "@/components/IncidentDetail";
import ClusterListPanel from "@/components/ClusterListPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import DistrictCard from "@/components/DistrictCard";
import type { MapHandle, WaypointPin } from "@/components/IncidentMap";
import {
  fetchIncidents,
  fetchSummary,
  fetchStats,
  type Incident,
  type StatsResponse,
} from "@/lib/api";
import { useTheme } from "@/lib/theme";
import AuthBar from "@/components/AuthBar";
import { isFirebaseConfigured } from "@/lib/firebase";
import { subscribeIncidents } from "@/lib/firestore";
import { enrichIncidents } from "@/lib/incident-weights";
import { buildLocalSummary } from "@/lib/local-summary";
import { getNeighborhood, incidentsInNeighborhood, NEIGHBORHOODS, type Neighborhood } from "@/lib/neighborhoods";
import { assessSafety } from "@/lib/search";
import Sparkline from "@/components/charts/Sparkline";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const WEIGHT_REFRESH_MS = 15000;

function statsFromIncidents(incidents: Incident[]): StatsResponse {
  const inhibitor_stats: Record<string, number> = {};
  for (const i of incidents) {
    const s = i.inhibitor_status;
    inhibitor_stats[s] = (inhibitor_stats[s] ?? 0) + 1;
  }
  return {
    total_incidents: incidents.length,
    inhibitor_stats,
  };
}

const CATEGORY_PILLS = [
  { label: "Violent", icon: Siren, cats: ["violent_weapon", "violent_no_weapon", "shots_heard", "robbery", "burglary_in_progress"], color: "#ef4444" },
  { label: "Medical", icon: HeartPulse, cats: ["medical_priority", "medical_other"], color: "#f472b6" },
  { label: "Traffic", icon: Car, cats: ["traffic_crash_injury", "traffic_crash_no_injury"], color: "#3b82f6" },
  { label: "Fire", icon: Flame, cats: ["fire_hazmat"], color: "#fb923c" },
  { label: "Disorder", icon: Volume2, cats: ["disorder", "admin_or_noise"], color: "#8b5cf6" },
] as const;

const TIME_FILTERS = [
  { label: "5m", hours: 5 / 60 },
  { label: "10m", hours: 10 / 60 },
  { label: "30m", hours: 0.5 },
  { label: "1h", hours: 1 },
  { label: "3h", hours: 3 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "1w", hours: 168 },
  { label: "1mo", hours: 720 },
  { label: "3mo", hours: 2160 },
  { label: "6mo", hours: 4320 },
] as const;

const FEED_LABELS: Record<string, string> = {
  "4603": "Citywide",
  "17310": "Central",
  "21297": "East",
  "45495": "Northeast",
  "18836": "Northwest",
  "15102": "South",
  "15195": "SW/West",
  "34250": "PFD South",
  "15747": "PFD North",
};

const IncidentMap = dynamic(() => import("@/components/IncidentMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--map-bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        <p className="text-xs font-medium" style={{ color: "var(--panel-text-muted)" }}>Loading map...</p>
      </div>
    </div>
  ),
});

const POLL_INTERVAL = 12000;

const THEME_OPTIONS = [
  { id: "auto" as const, icon: Monitor, label: "Auto" },
  { id: "light" as const, icon: Sun, label: "Light" },
  { id: "dark" as const, icon: Moon, label: "Dark" },
];

export default function Home() {
  const { mode, resolved, setMode } = useTheme();
  const isDark = resolved === "dark";
  const useFirestoreData = isFirebaseConfigured();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [routes, setRoutes] = useState<RouteData | null>(null);
  const [timeFilter, setTimeFilter] = useState(24);
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [mapTap, setMapTap] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tripGeometry, setTripGeometry] = useState<[number, number][] | null>(null);
  const [tripMode, setTripMode] = useState<string | null>(null);
  const [previewOrigin, setPreviewOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [previewDest, setPreviewDest] = useState<{ lat: number; lng: number } | null>(null);
  const [previewWaypoints, setPreviewWaypoints] = useState<WaypointPin[] | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [districtsEnabled, setDistrictsEnabled] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [tripProgress, setTripProgress] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "found" | "denied">("idle");
  const [routeDemoSimActive, setRouteDemoSimActive] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<{ neighborhood: Neighborhood; incidents: Incident[] } | null>(null);
  const [clusterIncidentIds, setClusterIncidentIds] = useState<string[] | null>(null);
  const mapRef = useRef<MapHandle>(null);

  const goToMyLocation = useCallback(() => {
    if (userLocation) {
      mapRef.current?.flyTo(userLocation.lat, userLocation.lng, 15);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapRef.current?.flyTo(loc.lat, loc.lng, 15);
      },
      () => {
        /* user denied or unavailable */
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [userLocation]);

  const recenterCity = useCallback(() => {
    mapRef.current?.resetView();
  }, []);

  const routeGeometryForDemo =
    tripGeometry ??
    routes?.safe?.geometry ??
    routes?.normal?.geometry ??
    null;

  const loadFromApi = useCallback(async () => {
    try {
      const [inc, sum, st] = await Promise.all([
        fetchIncidents(),
        fetchSummary(),
        fetchStats(),
      ]);
      setIncidents(inc);
      setSummary(sum.summary);
      setStats(st);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }, []);

  useEffect(() => {
    if (useFirestoreData) {
      const unsub = subscribeIncidents(
        (next) => setIncidents(next),
        (e) => console.error("Firestore incidents:", e)
      );
      return unsub;
    }
    void loadFromApi();
    const timer = setInterval(loadFromApi, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [useFirestoreData, loadFromApi]);

  useEffect(() => {
    const id = setInterval(() => {
      setIncidents((prev) => enrichIncidents(prev));
    }, WEIGHT_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!API_BASE) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const [sum, st] = await Promise.all([fetchSummary(), fetchStats()]);
        if (!cancelled) { setSummary(sum.summary); setStats(st); }
      } catch (e) { console.error("Summary/stats:", e); }
    };
    void pull();
    const t = setInterval(pull, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (API_BASE) return;
    if (!useFirestoreData) return;
    setSummary(buildLocalSummary(incidents));
    setStats(statsFromIncidents(incidents));
  }, [useFirestoreData, incidents]);

  const toggleCat = useCallback((cats: readonly string[]) => {
    setActiveCats((prev) => {
      const next = new Set(prev);
      const allActive = cats.every((c) => next.has(c));
      if (allActive) cats.forEach((c) => next.delete(c));
      else cats.forEach((c) => next.add(c));
      return next;
    });
  }, []);

  const filteredIncidents = incidents.filter((inc) => {
    if (inc.hidden) return false;
    const cutoff = Date.now() - timeFilter * 60 * 60 * 1000;
    if (new Date(inc.reported_at).getTime() < cutoff) return false;
    if (activeCats.size > 0 && !activeCats.has(inc.severity_category)) return false;
    return true;
  });

  const selected = filteredIncidents.find((i) => i.id === selectedId) || null;

  const clusterIncidents = useMemo(() => {
    if (!clusterIncidentIds) return null;
    const idSet = new Set(clusterIncidentIds);
    return filteredIncidents.filter((i) => idSet.has(i.id));
  }, [clusterIncidentIds, filteredIncidents]);

  const activeTimeLabel = TIME_FILTERS.find((tf) => tf.hours === timeFilter)?.label
    ? `Last ${TIME_FILTERS.find((tf) => tf.hours === timeFilter)!.label}`
    : "";

  const trendPct = useMemo(() => {
    const windowMs = timeFilter * 60 * 60 * 1000;
    const now = Date.now();
    const currentStart = now - windowMs;
    const prevStart = currentStart - windowMs;
    const current = incidents.filter((i) => {
      if (i.hidden) return false;
      const t = new Date(i.reported_at).getTime();
      return t >= currentStart;
    }).length;
    const prev = incidents.filter((i) => {
      if (i.hidden) return false;
      const t = new Date(i.reported_at).getTime();
      return t >= prevStart && t < currentStart;
    }).length;
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  }, [incidents, timeFilter]);

  const hotNeighborhoods = useMemo(() => {
    return NEIGHBORHOODS.map((n) => ({
      name: n.name,
      slug: n.slug,
      count: incidentsInNeighborhood(filteredIncidents, n.slug).length,
    }))
      .filter((n) => n.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredIncidents]);

  const categoryBreakdown = useMemo(() => {
    return CATEGORY_PILLS.map((pill) => ({
      label: pill.label,
      color: pill.color,
      cats: pill.cats,
      count: filteredIncidents.filter((i) => (pill.cats as readonly string[]).includes(i.severity_category)).length,
    })).filter((c) => c.count > 0);
  }, [filteredIncidents]);

  const hourlyData = useMemo(() => {
    const bins = new Array(24).fill(0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    for (const inc of filteredIncidents) {
      const d = new Date(inc.reported_at);
      if (d.getTime() >= todayStart.getTime()) {
        bins[d.getHours()]++;
      }
    }
    return bins;
  }, [filteredIncidents]);

  const activeFeeds = useMemo(() => {
    const feedCounts = new Map<string, number>();
    for (const inc of filteredIncidents) {
      if (inc.feed_id) {
        feedCounts.set(inc.feed_id, (feedCounts.get(inc.feed_id) ?? 0) + 1);
      }
    }
    return Array.from(feedCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: FEED_LABELS[id] || id, count }));
  }, [filteredIncidents]);

  const analyticsAreaName = mapTap
    ? getNeighborhood(mapTap.lat, mapTap.lng)?.name
    : undefined;

  const analyticsAreaIncidents = mapTap
    ? (() => {
        const result = assessSafety(
          { display_name: "", lat: mapTap.lat, lng: mapTap.lng },
          filteredIncidents,
          1.5
        );
        return result.nearbyIncidents;
      })()
    : undefined;

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "var(--map-bg)" }}>
      <AlertToast incidents={incidents} />

      <IncidentMap
        ref={mapRef}
        incidents={filteredIncidents}
        selectedId={selectedId}
        onSelectIncident={(id) => { setMapTap(null); setSelectedId(id); }}
        routes={routes}
        onMapTap={(lat, lng) => { setSelectedId(null); setMapTap({ lat, lng }); }}
        mapTapActive={mapTap !== null}
        userLocation={userLocation}
        tripRouteGeometry={tripGeometry}
        previewOrigin={previewOrigin}
        previewDest={previewDest}
        previewWaypoints={previewWaypoints}
        tripMode={tripMode}
        heatmapEnabled={heatmapEnabled}
        isDark={isDark}
        onTripProgress={setTripProgress}
        liveTripGps={gpsStatus === "found" || routeDemoSimActive}
        timeFilterHours={timeFilter}
        heatmapDemoBoost={routeDemoSimActive}
        districtsEnabled={districtsEnabled}
        onDistrictClick={(n, incs) => setSelectedDistrict({ neighborhood: n, incidents: incs })}
        onClusterClick={(ids) => { setSelectedId(null); setClusterIncidentIds(ids); }}
      />

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-3 left-3 z-[2001] w-10 h-10 flex items-center justify-center rounded-lg backdrop-blur-md shadow-lg"
        style={{ background: "var(--pill-bg)", border: "1px solid var(--pill-border)", color: "var(--pill-text)" }}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`max-md:${sidebarOpen ? "block" : "hidden"} md:block`}>
        <SearchSidebar
          incidents={filteredIncidents}
          onFlyTo={(lat, lng) => mapRef.current?.flyTo(lat, lng)}
          onRoutesChange={setRoutes}
          onUserLocation={(lat, lng) => setUserLocation({ lat, lng })}
          onTripActive={(active, geometry, m) => {
            setTripGeometry(active && geometry ? geometry : null);
            setTripMode(active && m ? m : null);
          }}
          onPreviewPins={(origin, dest) => {
            setPreviewOrigin(origin);
            setPreviewDest(dest);
          }}
          onPreviewWaypoints={setPreviewWaypoints}
          onSelectIncident={setSelectedId}
          selectedId={selectedId}
          tripProgress={tripProgress}
          onGpsStatusChange={setGpsStatus}
          routeGeometryForDemo={routeGeometryForDemo}
          onRouteDemoSimChange={setRouteDemoSimActive}
          timeFilterLabel={activeTimeLabel}
          trendPct={trendPct}
          hotNeighborhoods={hotNeighborhoods}
          categoryBreakdown={categoryBreakdown}
          hourlyData={hourlyData}
          onToggleCat={toggleCat}
        />
      </div>

      {/* Top category pills */}
      <div className="absolute top-3 left-0 md:left-[396px] right-3 z-[999] pointer-events-none max-md:pl-14">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
          <div
            className="flex items-center rounded-full overflow-hidden shadow-lg shrink-0 backdrop-blur-md"
            style={{ background: "var(--pill-bg)", border: "1px solid var(--pill-border)" }}
          >
            <Clock className="w-3.5 h-3.5 ml-3" style={{ color: "var(--panel-text-muted)" }} />
            {TIME_FILTERS.map((tf) => (
              <button
                key={tf.label}
                onClick={() => setTimeFilter(tf.hours)}
                className={`px-2 md:px-3 py-2 text-xs font-medium transition-all ${
                  timeFilter === tf.hours ? "bg-blue-500/15 text-blue-500" : ""
                }`}
                style={timeFilter !== tf.hours ? { color: "var(--pill-text)" } : {}}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 shrink-0 hidden md:block" style={{ background: "var(--pill-border)" }} />

          <button
            onClick={() => setActiveCats(new Set())}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all shrink-0 backdrop-blur-md shadow-lg ${
              activeCats.size === 0 ? "bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30" : "opacity-70 hover:opacity-100"
            }`}
            style={activeCats.size > 0 ? { background: "var(--pill-bg)", border: "1px solid var(--pill-border)", color: "var(--pill-text)" } : { background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}
          >
            All
          </button>

          {CATEGORY_PILLS.map((pill) => {
            const Icon = pill.icon;
            const isActive = pill.cats.some((c) => activeCats.has(c));
            const count = filteredIncidents.filter(i => (pill.cats as readonly string[]).includes(i.severity_category)).length;
            return (
              <button
                key={pill.label}
                onClick={() => toggleCat(pill.cats)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all shrink-0 backdrop-blur-md shadow-lg ${
                  isActive ? "ring-1" : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  background: isActive ? pill.color + "18" : "var(--pill-bg)",
                  border: `1px solid ${isActive ? pill.color + "40" : "var(--pill-border)"}`,
                  color: isActive ? pill.color : "var(--pill-text)",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{pill.label}</span>
                {count > 0 && (
                  <span className="text-[10px] font-mono" style={{ opacity: isActive ? 1 : 0.5 }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom-right controls (lifted so map markers under corner overlap UI less) */}
      <div className="absolute bottom-[4.5rem] max-md:bottom-20 right-3 z-[1001] flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={goToMyLocation}
          title="My location"
          aria-label="Center map on my location"
          className="w-10 h-10 flex items-center justify-center rounded-lg backdrop-blur-md shadow-lg transition-opacity hover:opacity-90 active:scale-95"
          style={{
            background: "var(--pill-bg)",
            border: "1px solid var(--pill-border)",
            color: "var(--panel-text)",
          }}
        >
          <LocateFixed className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={recenterCity}
          title="City overview"
          aria-label="Recenter map on Philadelphia"
          className="w-10 h-10 flex items-center justify-center rounded-lg backdrop-blur-md shadow-lg transition-opacity hover:opacity-90 active:scale-95"
          style={{
            background: "var(--pill-bg)",
            border: "1px solid var(--pill-border)",
            color: "var(--panel-text)",
          }}
        >
          <House className="w-4 h-4" />
        </button>
        <AuthBar />

        {/* Analytics toggle */}
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-10 h-10 flex items-center justify-center rounded-lg backdrop-blur-md shadow-lg transition-colors"
          style={{
            background: showAnalytics ? "rgba(59,130,246,0.15)" : "var(--pill-bg)",
            border: `1px solid ${showAnalytics ? "rgba(59,130,246,0.3)" : "var(--pill-border)"}`,
            color: showAnalytics ? "#3b82f6" : "var(--pill-text)",
          }}
          title="Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <div className="relative">
          <button
            onClick={() => { setShowTheme(!showTheme); setShowLayers(false); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg backdrop-blur-md shadow-lg transition-colors"
            style={{
              background: "var(--pill-bg)",
              border: "1px solid var(--pill-border)",
              color: "var(--pill-text)",
            }}
            title={`Theme: ${mode}`}
          >
            {mode === "auto" ? <Monitor className="w-4 h-4" /> : isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showTheme && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                className="absolute bottom-12 right-0 w-40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md"
                style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--panel-text-muted)" }}>Theme</p>
                {THEME_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { setMode(opt.id); setShowTheme(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                        isActive ? "bg-blue-500/10 text-blue-500" : ""
                      }`}
                      style={!isActive ? { color: "var(--panel-text-secondary)" } : {}}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--panel-hover)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? "" : "transparent"; }}
                    >
                      <Icon className="w-4 h-4" />
                      {opt.label}
                      {opt.id === "auto" && (
                        <span className="ml-auto text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
                          ({resolved})
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Layers toggle */}
        <div className="relative">
          <button
            onClick={() => { setShowLayers(!showLayers); setShowTheme(false); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg backdrop-blur-md shadow-lg transition-colors"
            style={{
              background: "var(--pill-bg)",
              border: "1px solid var(--pill-border)",
              color: "var(--pill-text)",
            }}
            title="Layers"
          >
            <Layers className="w-4.5 h-4.5" />
          </button>
          <AnimatePresence>
            {showLayers && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                className="absolute bottom-12 right-0 w-48 rounded-xl shadow-2xl overflow-hidden p-2 backdrop-blur-md"
                style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: "var(--panel-text-muted)" }}>Map Layers</p>
                <button
                  onClick={() => setHeatmapEnabled(!heatmapEnabled)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg transition-colors text-xs"
                  style={{ color: "var(--panel-text-secondary)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span>Heatmap</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${heatmapEnabled ? "bg-blue-500" : ""}`}
                    style={!heatmapEnabled ? { background: "var(--panel-input-bg)" } : {}}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform ${heatmapEnabled ? "left-4" : "left-0.5"}`} />
                  </div>
                </button>
                <button
                  onClick={() => setDistrictsEnabled(!districtsEnabled)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg transition-colors text-xs"
                  style={{ color: "var(--panel-text-secondary)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span>Districts</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${districtsEnabled ? "bg-blue-500" : ""}`}
                    style={!districtsEnabled ? { background: "var(--panel-input-bg)" } : {}}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform ${districtsEnabled ? "left-4" : "left-0.5"}`} />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info / About */}
        <button
          onClick={() => setShowAbout(!showAbout)}
          className="w-10 h-10 flex items-center justify-center rounded-lg backdrop-blur-md shadow-lg transition-colors"
          style={{
            background: "var(--pill-bg)",
            border: "1px solid var(--pill-border)",
            color: "var(--pill-text)",
          }}
          title="About PHLPulse"
        >
          {showAbout ? <X className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 md:left-[380px] right-0 z-[998] pointer-events-none">
        <div
          className="flex items-center justify-between px-4 py-2 backdrop-blur-md"
          style={{ background: "var(--status-bg)", borderTop: "1px solid var(--status-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-500 font-medium">LIVE</span>
            </div>
            <span className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>·</span>
            <span className="text-[10px]" style={{ color: "var(--panel-text-secondary)" }}>
              {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? "s" : ""}{activeTimeLabel ? ` (${activeTimeLabel.toLowerCase()})` : ""} in Philadelphia metro
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeFeeds.length > 0 && (
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <Radio className="w-3 h-3" style={{ color: "var(--panel-text-muted)" }} />
                {activeFeeds.slice(0, 4).map((f) => (
                  <span key={f.id} className="flex items-center gap-1 text-[9px]" style={{ color: "var(--panel-text-muted)" }}>
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    {f.label}
                  </span>
                ))}
                {activeFeeds.length > 4 && (
                  <span className="text-[9px]" style={{ color: "var(--panel-text-muted)" }}>
                    +{activeFeeds.length - 4}
                  </span>
                )}
              </div>
            )}
            <span className="text-[10px] hidden sm:inline" style={{ color: "var(--panel-text-muted)" }}>
              {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} EST
            </span>
            <img src="/logo.png" alt="" className="w-4 h-4 opacity-50" />
          </div>
        </div>
      </div>

      {/* About panel */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-3 z-[1000] w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl shadow-2xl backdrop-blur-xl p-4 space-y-3"
            style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}
          >
            <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: "var(--panel-text)" }}>
              <Shield className="w-4 h-4 text-blue-500" />
              Transparency & Responsible AI
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--panel-text-secondary)" }}>
              PHLPulse uses AI at every layer: speech-to-text (Whisper)
              converts police scanner audio, an LLM extracts structured incident
              data, and geocoding places it on this map.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--panel-text-secondary)" }}>
              Every incident is evaluated by the{" "}
              <strong className="text-blue-500">Applied AI Studio Inhibitor</strong> ethical guardrail.
              Content flagged for PII, potential harm, or hallucination is blocked.
            </p>
            {stats && (
              <div className="text-xs space-y-1.5 rounded-lg p-3" style={{ background: "var(--panel-input-bg)" }}>
                <p>
                  <span className="text-2xl font-bold text-blue-500">{stats.total_incidents}</span>
                  <span className="ml-2" style={{ color: "var(--panel-text-secondary)" }}>incidents processed</span>
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(stats.inhibitor_stats).map(([status, count]) => (
                    <Badge key={status} variant="outline" className="text-[10px] font-mono" style={{ borderColor: "var(--panel-border)", color: "var(--panel-text-secondary)" }}>
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {summary && (
              <div className="rounded-lg p-3" style={{ background: "var(--panel-input-bg)" }}>
                <p className="text-[10px] text-blue-500 font-medium mb-1.5 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> AI SUMMARY
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--panel-text-secondary)" }}>{summary}</p>
              </div>
            )}
            <div className="text-[10px] pt-3" style={{ borderTop: "1px solid var(--panel-border)", color: "var(--panel-text-secondary)" }}>
              <p className="font-medium text-amber-500 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> DISCLAIMER
              </p>
              <p className="leading-relaxed" style={{ color: "var(--panel-text-muted)" }}>
                All data is sourced from public radio scanner audio via AI
                transcription. Every pin is <strong style={{ color: "var(--panel-text-secondary)" }}>UNVERIFIED</strong>. Not
                real-time 911 data. Do not rely on this for safety-critical decisions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety Score Card */}
      <AnimatePresence>
        {mapTap && !selected && !showAnalytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-3 md:left-[396px] z-[1000] w-80 max-w-[calc(100vw-1.5rem)]"
          >
            <SafetyScoreCard
              lat={mapTap.lat}
              lng={mapTap.lng}
              incidents={filteredIncidents}
              onClose={() => setMapTap(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-3 md:left-[396px] z-[1000] w-96 max-w-[calc(100vw-1.5rem)]"
          >
            <AnalyticsPanel
              incidents={filteredIncidents}
              areaIncidents={analyticsAreaIncidents}
              areaName={analyticsAreaName}
              onClose={() => setShowAnalytics(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* District Stats Card */}
      <AnimatePresence>
        {selectedDistrict && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-3 md:left-[396px] z-[1000] w-80 max-w-[calc(100vw-1.5rem)]"
          >
            <DistrictCard
              neighborhood={selectedDistrict.neighborhood}
              incidents={selectedDistrict.incidents}
              color={(() => {
                const DISTRICT_COLORS = [
                  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
                  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a3e635",
                  "#e879f9", "#fb923c", "#34d399", "#818cf8", "#fbbf24",
                  "#f87171", "#2dd4bf", "#c084fc", "#4ade80", "#38bdf8",
                ];
                const idx = NEIGHBORHOODS.findIndex((n) => n.slug === selectedDistrict.neighborhood.slug);
                return DISTRICT_COLORS[idx >= 0 ? idx % DISTRICT_COLORS.length : 0];
              })()}
              onClose={() => setSelectedDistrict(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cluster List */}
      <AnimatePresence>
        {clusterIncidents && clusterIncidents.length > 0 && !selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-3 md:left-[396px] z-[1000] w-96 max-w-[calc(100vw-1.5rem)]"
          >
            <ClusterListPanel
              incidents={clusterIncidents}
              onSelect={(id) => { setClusterIncidentIds(null); setSelectedId(id); }}
              onClose={() => setClusterIncidentIds(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incident Detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-3 md:left-[396px] z-[1000] w-96 max-w-[calc(100vw-1.5rem)]"
          >
            <IncidentDetail
              incident={selected}
              onClose={() => setSelectedId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
