import type { Incident } from "./api";

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

export interface TrendPoint {
  date: string;
  count: number;
}

export interface CategoryTrend {
  category: string;
  label: string;
  color: string;
  data: TrendPoint[];
}

const TREND_CATEGORIES: { cats: string[]; label: string; color: string }[] = [
  { cats: ["violent_weapon", "violent_no_weapon", "shots_heard", "robbery", "burglary_in_progress"], label: "Violent", color: "#ef4444" },
  { cats: ["medical_priority", "medical_other"], label: "Medical", color: "#f472b6" },
  { cats: ["traffic_crash_injury", "traffic_crash_no_injury"], label: "Traffic", color: "#3b82f6" },
  { cats: ["fire_hazmat"], label: "Fire", color: "#fb923c" },
  { cats: ["disorder", "admin_or_noise"], label: "Disorder", color: "#8b5cf6" },
];

export function trendByDay(
  incidents: Incident[],
  days: number = 30
): CategoryTrend[] {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const filtered = incidents.filter(
    (i) => new Date(i.reported_at).getTime() >= cutoff
  );

  const dateKeys: string[] = [];
  for (let d = 0; d < days; d++) {
    const dt = new Date(now - (days - 1 - d) * 24 * 60 * 60 * 1000);
    dateKeys.push(dt.toISOString().slice(0, 10));
  }

  return TREND_CATEGORIES.map(({ cats, label, color }) => {
    const countMap: Record<string, number> = {};
    for (const dk of dateKeys) countMap[dk] = 0;
    for (const inc of filtered) {
      if (cats.includes(inc.severity_category)) {
        const dk = new Date(inc.reported_at).toISOString().slice(0, 10);
        if (dk in countMap) countMap[dk]++;
      }
    }
    return {
      category: cats[0],
      label,
      color,
      data: dateKeys.map((dk) => ({ date: dk, count: countMap[dk] })),
    };
  });
}

/** 7x24 matrix: [dayOfWeek 0=Mon .. 6=Sun][hour 0-23] */
export function timeGrid(incidents: Incident[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0) as number[]
  );
  for (const inc of incidents) {
    const dt = new Date(inc.reported_at);
    const dow = (dt.getDay() + 6) % 7;
    grid[dow][dt.getHours()]++;
  }
  return grid;
}

/** Per-hour counts for a 24-hour clock. */
export function hourDistribution(incidents: Incident[]): number[] {
  const hours = Array(24).fill(0) as number[];
  for (const inc of incidents) {
    hours[new Date(inc.reported_at).getHours()]++;
  }
  return hours;
}

export interface CategoryComparison {
  label: string;
  color: string;
  areaRate: number;
  cityRate: number;
}

export function areaVsCityComparison(
  areaIncidents: Incident[],
  allIncidents: Incident[]
): CategoryComparison[] {
  const areaTotal = Math.max(areaIncidents.length, 1);
  const cityTotal = Math.max(allIncidents.length, 1);

  return TREND_CATEGORIES.map(({ cats, label, color }) => {
    const areaCount = areaIncidents.filter((i) =>
      cats.includes(i.severity_category)
    ).length;
    const cityCount = allIncidents.filter((i) =>
      cats.includes(i.severity_category)
    ).length;
    return {
      label,
      color,
      areaRate: areaCount / areaTotal,
      cityRate: cityCount / cityTotal,
    };
  });
}

export function routeSafetyByHour(
  routeGeometry: [number, number][],
  incidents: Incident[],
  bufferKm: number = 0.2
): number[] {
  const hours = Array(24).fill(0) as number[];
  const nearby = incidents.filter((inc) => {
    if (inc.lat == null || inc.lng == null) return false;
    for (let i = 0; i < routeGeometry.length; i += 5) {
      const [rlat, rlng] = routeGeometry[i];
      if (haversineKm(inc.lat, inc.lng, rlat, rlng) <= bufferKm) return true;
    }
    return false;
  });
  for (const inc of nearby) {
    hours[new Date(inc.reported_at).getHours()]++;
  }
  return hours;
}

export function bestTravelWindow(hourCounts: number[]): {
  startHour: number;
  endHour: number;
  avgIncidents: number;
} {
  let bestStart = 0;
  let bestSum = Infinity;
  for (let start = 0; start < 24; start++) {
    const sum = hourCounts[start] + hourCounts[(start + 1) % 24];
    if (sum < bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }
  return {
    startHour: bestStart,
    endHour: (bestStart + 2) % 24,
    avgIncidents: bestSum / 2,
  };
}

export function incidentsNearRoute(
  routeGeometry: [number, number][],
  incidents: Incident[],
  bufferKm: number = 0.2
): Incident[] {
  return incidents.filter((inc) => {
    if (inc.lat == null || inc.lng == null) return false;
    for (let i = 0; i < routeGeometry.length; i += 5) {
      const [rlat, rlng] = routeGeometry[i];
      if (haversineKm(inc.lat, inc.lng, rlat, rlng) <= bufferKm) return true;
    }
    return false;
  });
}
