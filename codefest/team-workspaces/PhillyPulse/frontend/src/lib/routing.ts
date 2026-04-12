import type { Incident } from "./api";

const ORS_URL = "https://api.openrouteservice.org/v2/directions";

/** Same base as `lib/api.ts` so routing hits the backend when using NEXT_PUBLIC_API_URL. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function routeDirectionsUrl(): string {
  return `${API_BASE}/api/route-directions`;
}

export type TransportMode = "foot-walking" | "cycling-regular" | "driving-car";

export interface RouteResult {
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
  isSafe: boolean;
}

export interface AvoidZone {
  center: [number, number];
  radiusM: number;
}

function circleToPolygon(
  lat: number,
  lng: number,
  radiusM: number,
  points = 16
): number[][] {
  const coords: number[][] = [];
  const R = 6371000;
  for (let i = 0; i <= points; i++) {
    const angle = (2 * Math.PI * i) / points;
    const dLat = (radiusM * Math.cos(angle)) / R;
    const dLng =
      (radiusM * Math.sin(angle)) / (R * Math.cos((lat * Math.PI) / 180));
    coords.push([lng + (dLng * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  return coords;
}

export function buildAvoidZones(incidents: Incident[]): AvoidZone[] {
  return incidents
    .filter(
      (inc) => inc.lat != null && inc.lng != null && (inc.w_eff ?? 0) > 0.25
    )
    .map((inc) => ({
      center: [inc.lat!, inc.lng!] as [number, number],
      radiusM: 150 + (inc.w_eff ?? 0.5) * 200,
    }));
}

export function buildAvoidPolygons(
  zones: AvoidZone[]
): GeoJSON.MultiPolygon | null {
  if (zones.length === 0) return null;
  const polygons = zones.map((z) =>
    [circleToPolygon(z.center[0], z.center[1], z.radiusM)]
  );
  return {
    type: "MultiPolygon",
    coordinates: polygons,
  };
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/**
 * Street-level routing via OSRM, proxied through PhillyPulse API (/api/route-directions).
 * Direct browser calls to router.project-osrm.org are blocked by CORS, so we never hit OSRM from the client.
 */
async function getRouteOSRM(
  mode: TransportMode,
  waypoints: [number, number][],
  isSafe = false
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;
  try {
    const res = await fetch(routeDirectionsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waypoints, mode }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      geometry?: [number, number][];
      distanceKm?: number;
      durationMin?: number;
    };
    if (!data.geometry || !Array.isArray(data.geometry) || data.geometry.length < 2) {
      return null;
    }
    return {
      geometry: data.geometry,
      distanceKm: data.distanceKm ?? 0,
      durationMin: data.durationMin ?? 0,
      isSafe,
    };
  } catch {
    return null;
  }
}

/** Join consecutive leg geometries (drop duplicate seam points). */
function mergeRouteLegs(legs: [number, number][][]): [number, number][] {
  const out: [number, number][] = [];
  const close = (a: [number, number], b: [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-4;

  for (const leg of legs) {
    if (leg.length === 0) continue;
    if (out.length === 0) {
      out.push(...leg);
      continue;
    }
    let start = 0;
    if (close(leg[0], out[out.length - 1])) start = 1;
    for (let j = start; j < leg.length; j++) out.push(leg[j]);
  }
  return out;
}

/**
 * Multi-via routing as A→B, B→C, … then merge. More reliable than one OSRM call on public demo.
 */
async function getRouteOSRMChained(
  mode: TransportMode,
  waypoints: [number, number][],
  isSafe = false
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;
  const geometries: [number, number][][] = [];
  let distanceKm = 0;
  let durationMin = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = await getRouteOSRM(
      mode,
      [waypoints[i], waypoints[i + 1]],
      isSafe
    );
    if (!leg) return null;
    geometries.push(leg.geometry);
    distanceKm += leg.distanceKm;
    durationMin += leg.durationMin;
  }
  const geometry = mergeRouteLegs(geometries);
  if (geometry.length < 2) return null;
  return { geometry, distanceKm, durationMin, isSafe };
}

/** Try ORS first, then fall back to OSRM for street-level routing */
export async function getRoute(
  apiKey: string,
  mode: TransportMode,
  start: [number, number],
  end: [number, number],
  avoidPolygons?: GeoJSON.MultiPolygon | null
): Promise<RouteResult | null> {
  return getMultiStopRoute(apiKey, mode, [start, end], avoidPolygons);
}

export async function getMultiStopRoute(
  apiKey: string,
  mode: TransportMode,
  waypoints: [number, number][],
  avoidPolygons?: GeoJSON.MultiPolygon | null
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  // Try ORS first (supports avoidance polygons)
  const body: Record<string, unknown> = {
    coordinates: waypoints.map(([lat, lng]) => [lng, lat]),
  };

  if (avoidPolygons && avoidPolygons.coordinates.length > 0) {
    body.options = { avoid_polygons: avoidPolygons };
  }

  try {
    const res = await fetch(`${ORS_URL}/${mode}`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const route = data.routes?.[0];
      if (route) {
        const geometry = decodePolyline(route.geometry);
        return {
          geometry,
          distanceKm: route.summary.distance / 1000,
          durationMin: route.summary.duration / 60,
          isSafe: !!avoidPolygons,
        };
      }
    }
  } catch {
    // ORS failed, will try OSRM below
  }

  const isSafe = !!avoidPolygons;
  // OSRM via backend proxy (street geometry)
  let osrm = await getRouteOSRM(mode, waypoints, isSafe);
  if (!osrm && waypoints.length > 2) {
    osrm = await getRouteOSRMChained(mode, waypoints, isSafe);
  }
  return osrm;
}
