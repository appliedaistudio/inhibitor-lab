"use client";

import { useState, useCallback } from "react";
import {
  Navigation,
  Footprints,
  Bike,
  Car,
  X,
  Route,
  Clock,
  Ruler,
  ShieldCheck,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getRoute,
  buildAvoidZones,
  buildAvoidPolygons,
  type TransportMode,
  type RouteResult,
  type AvoidZone,
} from "@/lib/routing";
import { geocodePhilly } from "@/lib/search";
import type { Incident } from "@/lib/api";

const ORS_API_KEY =
  process.env.NEXT_PUBLIC_ORS_KEY || "5b3ce3597851110001cf6248a1b2c3d4e5f6a7b8";

const MODES: { id: TransportMode; label: string; icon: typeof Footprints }[] = [
  { id: "foot-walking", label: "Walk", icon: Footprints },
  { id: "cycling-regular", label: "Bike", icon: Bike },
  { id: "driving-car", label: "Drive", icon: Car },
];

export interface RouteData {
  normal: RouteResult | null;
  safe: RouteResult | null;
  avoidZones: AvoidZone[];
}

interface Props {
  incidents: Incident[];
  onRoutesChange: (routes: RouteData | null) => void;
}

export default function RoutePanel({ incidents, onRoutesChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TransportMode>("foot-walking");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoute = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRouteData(null);
    onRoutesChange(null);

    try {
      const [originResults, destResults] = await Promise.all([
        geocodePhilly(origin),
        geocodePhilly(destination),
      ]);

      if (originResults.length === 0) {
        setError("Couldn't find origin location");
        setLoading(false);
        return;
      }
      if (destResults.length === 0) {
        setError("Couldn't find destination location");
        setLoading(false);
        return;
      }

      const start: [number, number] = [
        originResults[0].lat,
        originResults[0].lng,
      ];
      const end: [number, number] = [destResults[0].lat, destResults[0].lng];

      const zones = buildAvoidZones(incidents);
      const avoidPolygons = buildAvoidPolygons(zones);

      const [normalRoute, safeRoute] = await Promise.all([
        getRoute(ORS_API_KEY, mode, start, end),
        getRoute(ORS_API_KEY, mode, start, end, avoidPolygons),
      ]);

      const data: RouteData = {
        normal: normalRoute,
        safe: safeRoute,
        avoidZones: zones,
      };

      setRouteData(data);
      onRoutesChange(data);

      if (!normalRoute && !safeRoute) {
        setError("No route found. Try different locations.");
      }
    } catch {
      setError("Routing failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, mode, incidents, onRoutesChange]);

  const clearRoutes = () => {
    setRouteData(null);
    onRoutesChange(null);
    setOrigin("");
    setDestination("");
    setError(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[1000] bg-blue-600 hover:bg-blue-500 text-white rounded-full p-3 shadow-lg transition-all hover:scale-105"
      >
        <Navigation className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1000] w-80 bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Safe Route</span>
        </div>
        <div className="flex gap-1">
          {routeData && (
            <button
              onClick={clearRoutes}
              className="text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Mode selector */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === m.id
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Origin / Destination */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Starting point..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Route button */}
        <Button
          onClick={handleRoute}
          disabled={loading || !origin.trim() || !destination.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          size="sm"
        >
          {loading ? (
            "Finding safe route..."
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Find Safe Route
            </>
          )}
        </Button>

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        {/* Results */}
        {routeData && (routeData.normal || routeData.safe) && (
          <div className="space-y-2 pt-1">
            {routeData.safe && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SAFE ROUTE
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3 h-3" />
                    {routeData.safe.distanceKm.toFixed(1)} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.ceil(routeData.safe.durationMin)} min
                  </span>
                </div>
                {routeData.avoidZones.length > 0 && (
                  <p className="text-xs text-green-400/70">
                    Avoids {routeData.avoidZones.length} incident zone
                    {routeData.avoidZones.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {routeData.normal && (
              <div className="bg-muted/20 border border-border/30 rounded-lg p-3 space-y-1">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ChevronUp className="w-3.5 h-3.5 rotate-90" />
                  DIRECT ROUTE
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3 h-3" />
                    {routeData.normal.distanceKm.toFixed(1)} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.ceil(routeData.normal.durationMin)} min
                  </span>
                </div>
              </div>
            )}

            {routeData.normal && routeData.safe && (
              <p className="text-center text-xs text-muted-foreground">
                Safe route is{" "}
                <span className="text-green-400 font-medium">
                  +
                  {Math.ceil(
                    routeData.safe.durationMin - routeData.normal.durationMin
                  )}{" "}
                  min
                </span>{" "}
                longer but avoids danger zones
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
