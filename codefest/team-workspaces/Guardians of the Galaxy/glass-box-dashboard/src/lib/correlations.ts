import type { RequestLifecycle } from './types';
import { humanizeObservation, humanizePrediction } from './humanize';

export interface CorrelationNode {
  id: string;
  label: string;
  type: 'observation' | 'prediction';
  count: number;
  color: string;
}

export interface CorrelationLink {
  source: string;
  target: string;
  weight: number;
}

export interface CorrelationData {
  nodes: CorrelationNode[];
  links: CorrelationLink[];
}

/**
 * Build a correlation graph from request lifecycles.
 * For each request, every observation is linked to every prediction
 * that appeared in the same request. Weight = co-occurrence count.
 */
export function buildCorrelationData(requests: RequestLifecycle[], topN = 12): CorrelationData {
  // Count co-occurrences
  const linkMap = new Map<string, number>();
  const obsCounts = new Map<string, number>();
  const predCounts = new Map<string, number>();

  for (const req of requests) {
    const obsKeys = new Set(req.observations.map(o => o.key));
    const predKeys = new Set(req.predictions.map(p => p.key));

    for (const o of obsKeys) {
      obsCounts.set(o, (obsCounts.get(o) || 0) + 1);
    }
    for (const p of predKeys) {
      predCounts.set(p, (predCounts.get(p) || 0) + 1);
    }
    for (const o of obsKeys) {
      for (const p of predKeys) {
        const key = `${o}::${p}`;
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
      }
    }
  }

  // Get top observations and predictions by frequency
  const topObs = [...obsCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => key);

  const topPred = [...predCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => key);

  const topObsSet = new Set(topObs);
  const topPredSet = new Set(topPred);

  // Build nodes
  const nodes: CorrelationNode[] = [
    ...topObs.map(key => ({
      id: `obs_${key}`,
      label: humanizeObservation(key),
      type: 'observation' as const,
      count: obsCounts.get(key) || 0,
      color: '#ffb547',
    })),
    ...topPred.map(key => ({
      id: `pred_${key}`,
      label: humanizePrediction(key),
      type: 'prediction' as const,
      count: predCounts.get(key) || 0,
      color: '#ff3b5c',
    })),
  ];

  // Build links (only between top nodes)
  const links: CorrelationLink[] = [];
  for (const [key, weight] of linkMap.entries()) {
    const [obs, pred] = key.split('::');
    if (topObsSet.has(obs) && topPredSet.has(pred) && weight >= 2) {
      links.push({
        source: `obs_${obs}`,
        target: `pred_${pred}`,
        weight,
      });
    }
  }

  return { nodes, links };
}
