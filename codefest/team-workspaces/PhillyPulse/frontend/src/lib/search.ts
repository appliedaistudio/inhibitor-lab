import type { Incident } from "./api";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHILLY_VIEWBOX = "-75.28,39.87,-74.96,40.14";

export interface GeoResult {
  display_name: string;
  lat: number;
  lng: number;
}

export interface SafetyResult {
  location: GeoResult;
  nearbyCount: number;
  avgSeverity: number;
  riskLevel: "low" | "moderate" | "elevated" | "high";
  riskColor: string;
  nearbyIncidents: Incident[];
}

export async function geocodePhilly(query: string): Promise<GeoResult[]> {
  if (!query.trim()) return [];

  const q = query.toLowerCase().includes("philadelphia")
    ? query
    : `${query}, Philadelphia, PA`;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "5",
    viewbox: PHILLY_VIEWBOX,
    bounded: "1",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": "PHLPulse/0.1" },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return data.map((r: { display_name: string; lat: string; lon: string }) => ({
    display_name: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function assessSafety(
  location: GeoResult,
  incidents: Incident[],
  radiusKm = 1.0
): SafetyResult {
  const nearby = incidents.filter(
    (inc) =>
      inc.lat != null &&
      inc.lng != null &&
      haversineKm(location.lat, location.lng, inc.lat!, inc.lng!) <= radiusKm
  );

  const avgSeverity =
    nearby.length > 0
      ? nearby.reduce((sum, inc) => sum + inc.s_base, 0) / nearby.length
      : 0;

  let riskLevel: SafetyResult["riskLevel"];
  let riskColor: string;

  if (nearby.length === 0) {
    riskLevel = "low";
    riskColor = "#22c55e";
  } else if (nearby.length <= 2 && avgSeverity < 0.5) {
    riskLevel = "moderate";
    riskColor = "#eab308";
  } else if (nearby.length <= 5) {
    riskLevel = "elevated";
    riskColor = "#f97316";
  } else {
    riskLevel = "high";
    riskColor = "#ef4444";
  }

  return {
    location,
    nearbyCount: nearby.length,
    avgSeverity,
    riskLevel,
    riskColor,
    nearbyIncidents: nearby,
  };
}
