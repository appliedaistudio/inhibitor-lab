import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OSRM_BASE = "https://router.project-osrm.org/route/v1";
const OSRM_PROFILES: Record<string, string> = {
  "foot-walking": "foot",
  "cycling-regular": "bike",
  "driving-car": "car",
};

type Body = { waypoints?: unknown; mode?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { waypoints, mode = "driving-car" } = body;
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return NextResponse.json(
      { error: "Need at least two waypoints" },
      { status: 400 }
    );
  }

  for (const w of waypoints) {
    if (
      !Array.isArray(w) ||
      w.length !== 2 ||
      typeof w[0] !== "number" ||
      typeof w[1] !== "number"
    ) {
      return NextResponse.json({ error: "Invalid waypoint" }, { status: 400 });
    }
  }

  const pts = waypoints as [number, number][];
  const profile = OSRM_PROFILES[mode] ?? "car";
  const coordStr = pts.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_BASE}/${profile}/${coordStr}?overview=full&geometries=geojson`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "PHLPulse/1.0 (https://github.com/EYoung21/PhillyPulse)",
      },
      cache: "no-store",
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: "Routing service error" },
        { status: 502 }
      );
    }

    const data = (await resp.json()) as {
      code?: string;
      message?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    if (data.code != null && data.code !== "Ok") {
      return NextResponse.json(
        { error: data.message || data.code },
        { status: 404 }
      );
    }

    const routes = data.routes ?? [];
    if (routes.length === 0) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    const route = routes[0];
    const coords = route.geometry?.coordinates ?? [];
    if (coords.length < 2) {
      return NextResponse.json({ error: "Invalid geometry" }, { status: 502 });
    }

    const geometry: [number, number][] = coords.map(([lng, lat]) => [
      lat,
      lng,
    ]);

    return NextResponse.json({
      geometry,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    });
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
