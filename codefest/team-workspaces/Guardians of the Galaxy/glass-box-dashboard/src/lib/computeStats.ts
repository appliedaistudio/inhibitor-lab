import type { ParsedLogEvent, RequestLifecycle, DashboardStats, LatencyStats } from './types';

export function computeDashboardStats(
  events: ParsedLogEvent[],
  requests: RequestLifecycle[],
  authFailureCount: number,
): DashboardStats {
  // Event type counts
  const eventTypeCounts: Record<string, number> = {};
  for (const e of events) {
    eventTypeCounts[e.event] = (eventTypeCounts[e.event] || 0) + 1;
  }

  // Observation key counts across all requests
  const observationKeyCounts: Record<string, number> = {};
  for (const r of requests) {
    for (const obs of r.observations) {
      observationKeyCounts[obs.key] = (observationKeyCounts[obs.key] || 0) + 1;
    }
  }

  // Prediction key counts
  const predictionKeyCounts: Record<string, number> = {};
  for (const r of requests) {
    for (const pred of r.predictions) {
      predictionKeyCounts[pred.key] = (predictionKeyCounts[pred.key] || 0) + 1;
    }
  }

  // Compute latencies
  const embeddingLatencies = computeLatencies(events, 'embedding_start', 'embedding_complete');
  const llmLatencies = computeLatencies(events, 'llm_prompt_start', 'llm_prompt_complete');

  // Requests per hour
  const hourBuckets: Record<string, number> = {};
  for (const r of requests) {
    const hourKey = r.startTime.toISOString().slice(0, 13) + ':00';
    hourBuckets[hourKey] = (hourBuckets[hourKey] || 0) + 1;
  }
  const requestsPerHour = Object.entries(hourBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));

  // Total observations and predictions
  const totalObservations = requests.reduce((sum, r) => sum + r.observations.length, 0);
  const totalPredictions = requests.reduce((sum, r) => sum + r.predictions.length, 0);

  const timestamps = events.map(e => e.timestamp.getTime()).filter(t => !isNaN(t));

  return {
    totalEvents: events.length,
    totalRequests: requests.length,
    totalObservations,
    totalPredictions,
    totalAuthFailures: authFailureCount,
    validationPassRate: requests.length > 0
      ? requests.filter(r => r.validationPassed).length / requests.length
      : 0,
    avgRequestDuration: requests.length > 0
      ? requests.reduce((sum, r) => sum + r.durationMs, 0) / requests.length
      : 0,
    avgEventsPerRequest: requests.length > 0
      ? requests.reduce((sum, r) => sum + r.eventCount, 0) / requests.length
      : 0,
    timeSpanStart: new Date(Math.min(...timestamps)),
    timeSpanEnd: new Date(Math.max(...timestamps)),
    eventTypeCounts,
    observationKeyCounts,
    predictionKeyCounts,
    embeddingLatencies,
    llmLatencies,
    requestsPerHour,
  };
}

function computeLatencies(
  events: ParsedLogEvent[],
  startEvent: string,
  completeEvent: string,
): number[] {
  const latencies: number[] = [];
  const pending: Map<string, number> = new Map();

  // Group by apiKey and match start/complete pairs
  const byKey: Record<string, ParsedLogEvent[]> = {};
  for (const e of events) {
    if (e.event === startEvent || e.event === completeEvent) {
      if (!byKey[e.apiKey]) byKey[e.apiKey] = [];
      byKey[e.apiKey].push(e);
    }
  }

  for (const key in byKey) {
    const keyEvents = byKey[key];
    const starts: number[] = [];

    for (const e of keyEvents) {
      if (e.event === startEvent) {
        starts.push(e.timestamp.getTime());
      } else if (e.event === completeEvent && starts.length > 0) {
        const startTime = starts.shift()!;
        const latency = e.timestamp.getTime() - startTime;
        if (latency >= 0 && latency < 60000) { // sanity check: < 60s
          latencies.push(latency);
        }
      }
    }
  }

  return latencies.sort((a, b) => a - b);
}

export function computeLatencyStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / sorted.length),
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}
