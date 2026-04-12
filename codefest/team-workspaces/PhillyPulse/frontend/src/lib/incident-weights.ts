import type { Incident } from "@/lib/api";

const TAU_HOURS = 12;

function computeWEff(
  sBase: number,
  reportedAtIso: string,
  confidence: number,
  nowMs: number
): number {
  let reported: Date;
  try {
    reported = new Date(reportedAtIso);
    if (Number.isNaN(reported.getTime())) {
      return sBase * 0.05;
    }
  } catch {
    return sBase * 0.05;
  }
  const deltaHours = Math.max(
    (nowMs - reported.getTime()) / (1000 * 60 * 60),
    0
  );
  const c = Math.max(0.3, Math.min(confidence, 1));
  const timeDecay = Math.exp(-deltaHours / TAU_HOURS);
  return sBase * timeDecay * c;
}

export function enrichIncidents(incidents: Incident[]): Incident[] {
  const nowMs = Date.now();
  return incidents.map((inc) => ({
    ...inc,
    w_eff: Math.round(
      computeWEff(
        inc.s_base,
        inc.reported_at,
        inc.confidence,
        nowMs
      ) * 10000
    ) / 10000,
  }));
}
