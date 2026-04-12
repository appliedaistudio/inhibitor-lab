/**
 * Synthetic heat points around Philadelphia for demos / sparse real data.
 * Deterministic so the layer does not jitter on re-render.
 */
export function phillyDemoHeatPoints(): [number, number, number][] {
  const out: [number, number, number][] = [];
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const cluster = (
    centerLat: number,
    centerLng: number,
    spread: number,
    n: number,
    wMin: number,
    wMax: number
  ) => {
    for (let i = 0; i < n; i++) {
      const u = rnd() + rnd() + rnd() + rnd();
      const g = (u - 2) * spread;
      const v = rnd() + rnd() + rnd() + rnd();
      const h = (v - 2) * spread;
      const w = wMin + rnd() * (wMax - wMin);
      out.push([centerLat + g, centerLng + h, w]);
    }
  };

  // Center City / downtown
  cluster(39.9526, -75.1652, 0.016, 85, 0.35, 1.0);
  // West Philly / University City
  cluster(39.952, -75.198, 0.02, 65, 0.28, 0.88);
  cluster(39.9485, -75.21, 0.014, 42, 0.3, 0.82);
  // North Broad / Temple corridor
  cluster(39.985, -75.155, 0.018, 55, 0.26, 0.78);
  // Kensington / Fishtown band
  cluster(39.975, -75.13, 0.022, 62, 0.3, 0.92);
  cluster(39.968, -75.105, 0.015, 48, 0.24, 0.72);
  // South / stadiums / Passyunk
  cluster(39.905, -75.17, 0.024, 58, 0.3, 0.92);
  cluster(39.928, -75.164, 0.018, 44, 0.27, 0.8);
  // Northeast / Mayfair pocket
  cluster(39.97, -75.085, 0.018, 52, 0.22, 0.75);
  cluster(40.02, -75.08, 0.02, 40, 0.2, 0.68);
  // Roxborough / Manayunk ridge
  cluster(40.025, -75.22, 0.016, 36, 0.18, 0.65);
  cluster(40.015, -75.195, 0.012, 30, 0.2, 0.62);
  // Port Richmond / Bridesburg
  cluster(39.98, -75.095, 0.014, 34, 0.22, 0.7);
  // Scattered city-wide
  for (let i = 0; i < 120; i++) {
    const lat = 39.88 + rnd() * 0.16;
    const lng = -75.28 + rnd() * 0.24;
    out.push([lat, lng, 0.12 + rnd() * 0.58]);
  }

  return out;
}
