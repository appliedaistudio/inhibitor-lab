/** Great-circle segment length in meters. */
export function segmentLengthM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLat = lat2 - lat1;
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function routeLengthMeters(route: [number, number][]): number {
  let t = 0;
  for (let i = 0; i < route.length - 1; i++) {
    t += segmentLengthM(route[i], route[i + 1]);
  }
  return t;
}

/** Point at distance (m) from start along the polyline. */
export function pointAtDistanceMeters(
  route: [number, number][],
  distM: number
): [number, number] | null {
  const p0 = route[0];
  if (!p0 || route.length < 2) return p0 ?? null;
  if (distM <= 0) return route[0];
  const total = routeLengthMeters(route);
  if (distM >= total) return route[route.length - 1];

  let acc = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const segM = segmentLengthM(a, b);
    if (acc + segM >= distM) {
      const t = segM < 1e-9 ? 1 : (distM - acc) / segM;
      const lat = a[0] + t * (b[0] - a[0]);
      const lng = a[1] + t * (b[1] - a[1]);
      return [lat, lng];
    }
    acc += segM;
  }
  return route[route.length - 1];
}
