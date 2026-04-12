import type { Incident } from "./api";

export interface Neighborhood {
  name: string;
  slug: string;
  bounds: { north: number; south: number; east: number; west: number };
  center: { lat: number; lng: number };
}

export const NEIGHBORHOODS: Neighborhood[] = [
  { name: "Center City", slug: "center-city", bounds: { north: 39.962, south: 39.943, east: -75.145, west: -75.180 }, center: { lat: 39.9525, lng: -75.1636 } },
  { name: "Fishtown", slug: "fishtown", bounds: { north: 39.981, south: 39.966, east: -75.120, west: -75.143 }, center: { lat: 39.9735, lng: -75.1340 } },
  { name: "Kensington", slug: "kensington", bounds: { north: 39.997, south: 39.978, east: -75.108, west: -75.140 }, center: { lat: 39.9875, lng: -75.1250 } },
  { name: "Northern Liberties", slug: "northern-liberties", bounds: { north: 39.971, south: 39.960, east: -75.130, west: -75.150 }, center: { lat: 39.9655, lng: -75.1400 } },
  { name: "University City", slug: "university-city", bounds: { north: 39.960, south: 39.943, east: -75.185, west: -75.220 }, center: { lat: 39.9505, lng: -75.2000 } },
  { name: "South Philly", slug: "south-philly", bounds: { north: 39.943, south: 39.910, east: -75.130, west: -75.185 }, center: { lat: 39.9260, lng: -75.1640 } },
  { name: "North Philly", slug: "north-philly", bounds: { north: 40.020, south: 39.980, east: -75.130, west: -75.175 }, center: { lat: 40.0000, lng: -75.1520 } },
  { name: "West Philly", slug: "west-philly", bounds: { north: 39.968, south: 39.943, east: -75.220, west: -75.265 }, center: { lat: 39.9560, lng: -75.2400 } },
  { name: "Germantown", slug: "germantown", bounds: { north: 40.080, south: 40.050, east: -75.155, west: -75.190 }, center: { lat: 40.0650, lng: -75.1700 } },
  { name: "Manayunk", slug: "manayunk", bounds: { north: 40.035, south: 40.020, east: -75.210, west: -75.235 }, center: { lat: 40.0275, lng: -75.2230 } },
  { name: "Chestnut Hill", slug: "chestnut-hill", bounds: { north: 40.085, south: 40.068, east: -75.185, west: -75.215 }, center: { lat: 40.0765, lng: -75.2000 } },
  { name: "Mount Airy", slug: "mount-airy", bounds: { north: 40.070, south: 40.050, east: -75.190, west: -75.220 }, center: { lat: 40.0600, lng: -75.2050 } },
  { name: "Old City", slug: "old-city", bounds: { north: 39.958, south: 39.948, east: -75.135, west: -75.150 }, center: { lat: 39.9530, lng: -75.1430 } },
  { name: "Fairmount", slug: "fairmount", bounds: { north: 39.975, south: 39.963, east: -75.160, west: -75.185 }, center: { lat: 39.9690, lng: -75.1730 } },
  { name: "Brewerytown", slug: "brewerytown", bounds: { north: 39.982, south: 39.972, east: -75.170, west: -75.195 }, center: { lat: 39.9770, lng: -75.1820 } },
  { name: "Point Breeze", slug: "point-breeze", bounds: { north: 39.940, south: 39.926, east: -75.170, west: -75.195 }, center: { lat: 39.9330, lng: -75.1830 } },
  { name: "Roxborough", slug: "roxborough", bounds: { north: 40.050, south: 40.030, east: -75.215, west: -75.250 }, center: { lat: 40.0400, lng: -75.2320 } },
  { name: "Port Richmond", slug: "port-richmond", bounds: { north: 39.985, south: 39.972, east: -75.095, west: -75.120 }, center: { lat: 39.9785, lng: -75.1075 } },
  { name: "Strawberry Mansion", slug: "strawberry-mansion", bounds: { north: 39.995, south: 39.980, east: -75.170, west: -75.195 }, center: { lat: 39.9875, lng: -75.1820 } },
  { name: "East Falls", slug: "east-falls", bounds: { north: 40.020, south: 40.005, east: -75.180, west: -75.210 }, center: { lat: 40.0125, lng: -75.1950 } },
];

export function getNeighborhood(lat: number, lng: number): Neighborhood | null {
  for (const n of NEIGHBORHOODS) {
    if (
      lat >= n.bounds.south &&
      lat <= n.bounds.north &&
      lng >= n.bounds.west &&
      lng <= n.bounds.east
    ) {
      return n;
    }
  }
  return null;
}

export function getNeighborhoodBySlug(slug: string): Neighborhood | null {
  return NEIGHBORHOODS.find((n) => n.slug === slug) ?? null;
}

export function incidentsInNeighborhood(
  incidents: Incident[],
  slug: string
): Incident[] {
  const n = getNeighborhoodBySlug(slug);
  if (!n) return [];
  return incidents.filter(
    (i) =>
      i.lat != null &&
      i.lng != null &&
      i.lat >= n.bounds.south &&
      i.lat <= n.bounds.north &&
      i.lng >= n.bounds.west &&
      i.lng <= n.bounds.east
  );
}
