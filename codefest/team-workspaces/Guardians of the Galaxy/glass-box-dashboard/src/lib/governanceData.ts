import type { RequestLifecycle, InterventionEvent } from './types';
import { humanizeObservation, humanizePrediction } from './humanize';

export interface GovernanceSignal {
  key: string;
  label: string;
  type: 'observation' | 'prediction';
  count: number;
  /** Which turns (1-indexed) this signal appeared in */
  turns: number[];
  color: string;
}

export interface GovernanceData {
  title: string;
  subtitle: string;
  turns: number;
  approved: number;
  blocked: number;
  corrections: number;
  signals: GovernanceSignal[];
  observations: GovernanceSignal[];
  predictions: GovernanceSignal[];
}

const OBS_COLORS = ['#00e5a0', '#00c98a', '#00b87a', '#2dd4bf', '#34d399', '#6ee7b7'];
const PRED_COLORS = ['#ff3b5c', '#f97066', '#ff6b6b', '#fb923c', '#f472b6', '#e879f9'];

export function buildGovernanceData(
  request: RequestLifecycle,
  interventions: InterventionEvent[],
): GovernanceData {
  // Count "turns" as major processing stages
  const stageOrder = ['embedding', 'llm', 'observation', 'prediction', 'rules', 'validation'];
  const stagesSeen = new Set<string>();
  for (const e of request.events) {
    stagesSeen.add(e.category);
  }
  const turns = stageOrder.filter(s => stagesSeen.has(s)).length;

  // Count approved/blocked/corrections from rules and interventions
  const passedRules = request.ruleResults.filter(r => r.passed).length;
  const failedRules = request.ruleResults.filter(r => !r.passed).length;

  const matchingInterventions = interventions.filter(iv => {
    const ivTime = new Date(iv.timestamp).getTime();
    return ivTime >= request.startTime.getTime() && ivTime <= request.endTime.getTime();
  });

  const blocked = matchingInterventions.filter(iv => iv.action === 'blocked').length;
  const corrections = failedRules + matchingInterventions.filter(iv => iv.action === 'interrupted').length;

  // Build observation signals
  const obsMap = new Map<string, { count: number; turns: number[] }>();
  request.observations.forEach((obs, i) => {
    const entry = obsMap.get(obs.key) || { count: 0, turns: [] };
    entry.count++;
    entry.turns.push(Math.min(Math.ceil(((i + 1) / Math.max(request.observations.length, 1)) * turns), turns));
    obsMap.set(obs.key, entry);
  });

  const observations: GovernanceSignal[] = [...obsMap.entries()].map(([key, data], i) => ({
    key,
    label: humanizeObservation(key),
    type: 'observation',
    count: data.count,
    turns: [...new Set(data.turns)],
    color: OBS_COLORS[i % OBS_COLORS.length],
  }));

  // Build prediction signals
  const predMap = new Map<string, { count: number; turns: number[] }>();
  request.predictions.forEach((pred, i) => {
    const entry = predMap.get(pred.key) || { count: 0, turns: [] };
    entry.count++;
    entry.turns.push(Math.min(Math.ceil(((i + 1) / Math.max(request.predictions.length, 1)) * turns), turns));
    predMap.set(pred.key, entry);
  });

  const predictions: GovernanceSignal[] = [...predMap.entries()].map(([key, data], i) => ({
    key,
    label: humanizePrediction(key),
    type: 'prediction',
    count: data.count,
    turns: [...new Set(data.turns)],
    color: PRED_COLORS[i % PRED_COLORS.length],
  }));

  const signals = [...observations, ...predictions].sort((a, b) => b.count - a.count);

  // Derive subtitle from the dominant signal category
  const topSignal = signals[0];
  const subtitle = topSignal ? topSignal.label : 'Clean Request';

  return {
    title: 'Governance Review',
    subtitle,
    turns,
    approved: passedRules,
    blocked,
    corrections,
    signals,
    observations,
    predictions,
  };
}
