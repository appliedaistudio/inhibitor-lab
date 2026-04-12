import type { ParsedLogEvent, RequestLifecycle, ObservationEvent, PredictionEvent, RuleResult } from './types';

/**
 * Group parsed events into request lifecycles.
 *
 * Strategy: Match each `anon` request_success event with the subsequent
 * chain of `GEN_*` events that follow it temporally. Each chain runs from
 * the first GEN_ event after a request_success until the next request_success
 * or a gap of >30s.
 */
export function groupIntoRequests(events: ParsedLogEvent[]): RequestLifecycle[] {
  // Separate by apiKey type
  const anonEvents = events.filter(e => e.apiKey === 'anon' && e.event === 'request_success');
  const genEvents = events.filter(e => e.apiKey.startsWith('GEN_'));

  if (anonEvents.length === 0) return [];

  const requests: RequestLifecycle[] = [];

  for (let i = 0; i < anonEvents.length; i++) {
    const requestEvent = anonEvents[i];
    const nextRequestTime = i < anonEvents.length - 1
      ? anonEvents[i + 1].timestamp.getTime()
      : Infinity;

    // Find all GEN_ events between this request and the next
    const chainEvents = genEvents.filter(e => {
      const t = e.timestamp.getTime();
      return t >= requestEvent.timestamp.getTime() && t < nextRequestTime;
    });

    if (chainEvents.length === 0) continue;

    const allEvents = [requestEvent, ...chainEvents];
    const startTime = requestEvent.timestamp;
    const endTime = chainEvents[chainEvents.length - 1].timestamp;

    // Extract observations
    const observations: ObservationEvent[] = chainEvents
      .filter(e => e.event === 'inhibition_observation_description_response')
      .map(e => ({
        key: (e.meta.key as string) || '',
        length: (e.meta.length as number) || 0,
        timestamp: e.timestamp,
      }));

    // Extract predictions
    const predictions: PredictionEvent[] = chainEvents
      .filter(e => e.event === 'inhibition_prediction_reason_response')
      .map(e => ({
        key: (e.meta.key as string) || '',
        length: (e.meta.length as number) || 0,
        timestamp: e.timestamp,
      }));

    // Extract rule results
    const ruleStarts = chainEvents.filter(e => e.event === 'rules_inhibition_rule_start');
    const rulePassed = chainEvents.filter(e => e.event === 'rules_inhibition_rule_passed');
    const missingVars = chainEvents.filter(e => e.event === 'rules_extraction_value_missing');
    const missingBindings = chainEvents.filter(e => e.event === 'rules_inhibition_rule_binding_missing');

    const ruleResults: RuleResult[] = ruleStarts.map(rs => {
      const ruleId = rs.meta.ruleId as string;
      return {
        ruleId,
        passed: rulePassed.some(rp => rp.meta.ruleId === ruleId),
        missingVariables: missingVars
          .filter(mv => mv.meta.ruleId === ruleId)
          .map(mv => mv.meta.variable as string),
        missingBindings: missingBindings
          .filter(mb => mb.meta.ruleId === ruleId)
          .map(mb => mb.meta.reason as string),
      };
    });

    // Check validation
    const finalValidation = chainEvents.find(e => e.event === 'inhibition_final_validation');
    const validationPassed = finalValidation
      ? (finalValidation.meta.validationSuccess as boolean) === true
      : true;

    requests.push({
      id: `req-${i + 1}`,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      apiKey: chainEvents[0]?.apiKey || 'unknown',
      events: allEvents,
      eventCount: allEvents.length,
      observations,
      predictions,
      ruleResults,
      validationPassed,
      embeddingCount: chainEvents.filter(e => e.event === 'embedding_start').length,
      llmCount: chainEvents.filter(e => e.event === 'llm_prompt_start').length,
    });
  }

  return requests;
}
