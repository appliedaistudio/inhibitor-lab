import type { ChatIntent, DatasetEntry } from './types';
import { humanizeObservation, humanizePrediction, COMPLIANCE_DOMAINS } from './humanize';
import { computeLatencyStats } from './computeStats';

const POLICY_EXPLANATIONS: Record<string, string> = {
  'FIN-UNVERIFIED-LARGE-TRANSFER': 'Financial safeguard that requires human approval for transfers above a configured threshold. Aligns with SOX Section 302 and the principle of segregation of duties in financial operations.',
  'GDPR-PII-REDACTION': 'Privacy protection that prevents personally identifiable information from being shared externally. Required under GDPR Article 5(1)(f) and the data minimization principle.',
  'SEC-PROMPT-INJECTION': 'Security defense that detects and blocks attempts to override AI safety policies through crafted inputs. Addresses OWASP LLM Top 10 #1: Prompt Injection.',
  'FIN-UNAUTHORIZED-ACCOUNT-ACCESS': 'Prevents AI agents from accessing financial accounts without proper authorization chains. Relates to PCI-DSS requirement 7 (restrict access by business need-to-know).',
  'GDPR-CROSS-BORDER-TRANSFER': 'Blocks unauthorized cross-border data transfers that violate GDPR Chapter V provisions on international data transfers.',
  'SEC-DATA-EXFILTRATION': 'Detects and prevents attempts to extract sensitive data through AI agent outputs. Aligns with NIST AI RMF GOVERN 1.1.',
  'SEC-PRIVILEGE-ESCALATION': 'Prevents AI agents from obtaining elevated permissions beyond their assigned scope. Key defense against agentic AI autonomy risks.',
  'ETHICAL-BIAS-DETECTION': 'Flags outputs showing potential discriminatory patterns. Supports EU AI Act Article 10 requirements on training data quality and bias.',
  'SAFETY-HARMFUL-CONTENT': 'Blocks generation or transmission of harmful, violent, or illegal content. Core guardrail per Anthropic and OpenAI usage policies.',
};

const DOMAIN_KNOWLEDGE: Record<string, string> = {
  compliance_summary: `
=== AI Safety & Compliance Context ===
Key frameworks for evaluating AI compliance posture:
- **NIST AI Risk Management Framework (AI RMF 1.0)**: Organizes AI risks into Govern, Map, Measure, Manage functions. A high validation pass rate indicates strong Measure/Manage maturity.
- **EU AI Act**: Classifies AI systems by risk tier (unacceptable, high, limited, minimal). Safety oversight systems like Inhibitor help meet Article 14 (human oversight) and Article 9 (risk management) requirements.
- **ISO/IEC 42001**: AI Management System standard. Intervention logs provide evidence for conformity assessment.
- A validation pass rate above 95% is generally considered healthy; below 90% warrants immediate investigation.
- Intervention severity breakdown matters: even 1 high-severity event may require board-level reporting under some compliance frameworks.

Recommended resources:
- NIST AI RMF Playbook: https://airc.nist.gov/AI_RMF_Playbook
- EU AI Act full text: https://eur-lex.europa.eu/eli/reg/2024/1689
- ISO 42001 overview: https://www.iso.org/standard/81230.html`,

  intervention_explain: `
=== Understanding AI Safety Interventions ===
Interventions occur when the Inhibitor detects an AI agent action that violates safety policies. Key concepts:
- **Proposed vs Corrected action**: Shows what the AI tried to do and what safer alternative was substituted — this is the "glass box" transparency principle in action.
- **Policy triggers**: Each intervention maps to a named policy. Recurring triggers may indicate a misconfigured agent, inadequate training data, or an adversarial pattern.
- **Severity levels**: High = immediate harm potential (data breach, financial loss); Medium = policy violation with limited blast radius; Low = precautionary block.
- **Intervention modes**: "block" fully prevents the action; "modify" adjusts the output; "flag" allows but marks for human review.
- Root cause analysis: look for patterns — same agent, same policy, same time window — to distinguish systemic issues from one-off events.

Recommended resources:
- OWASP LLM Top 10: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Anthropic's AI Safety research: https://www.anthropic.com/research`,

  agent_query: `
=== AI Agent Governance ===
Understanding agent behavior patterns is critical for AI governance:
- **Agent risk profiling**: Agents with repeated high-severity interventions may need scope restrictions, additional guardrails, or retraining.
- **Least privilege principle**: Each agent should only have access to capabilities required for its function. Cross-domain policy triggers suggest permission creep.
- **Agent accountability**: ISO 42001 requires traceability of AI decisions. Each intervention creates an audit trail linking agent identity → attempted action → policy → corrective response.
- **Remediation strategies**: For high-risk agents, consider: sandbox testing, policy tightening, human-in-the-loop requirements, or capability restrictions.

Recommended resources:
- NIST AI RMF GOVERN function: https://airc.nist.gov/AI_RMF_Playbook
- Microsoft Responsible AI Standard: https://www.microsoft.com/en-us/ai/responsible-ai`,

  risk_signals: `
=== Risk Signal Analysis ===
Risk signals (observations) are early warning indicators detected during AI agent operation:
- **Bias signals**: Indicate potential discriminatory patterns in agent outputs. Relevant to EU AI Act Article 10 and US EEOC guidance on AI hiring tools.
- **PII exposure**: Personally identifiable information detected in agent I/O. GDPR, CCPA, and HIPAA all mandate PII controls.
- **Prompt injection attempts**: Adversarial inputs trying to override agent instructions. OWASP LLM #1 risk.
- **Jailbreak attempts**: Efforts to bypass safety guardrails. Indicates either external attack or misconfigured integration.
- **Data handling anomalies**: Unusual patterns in how data is accessed, transformed, or transmitted.
- **Correlation matters**: Multiple risk signal types appearing together often indicates a coordinated attack or systemic misconfiguration.

Recommended resources:
- OWASP LLM Top 10: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- MITRE ATLAS (Adversarial ML): https://atlas.mitre.org/
- NIST AI 100-2e2025 (AI risk taxonomy): https://csrc.nist.gov/publications/detail/sp/800-218a/final`,

  policy_explain: `
=== AI Safety Policy Framework ===
Policies are the rules engine that powers Inhibitor's safety oversight:
- **Policy categories**: Financial (FIN-*), Privacy (GDPR-*), Security (SEC-*), Ethical (ETHICAL-*), Safety (SAFETY-*).
- **Policy design principle**: Each policy encodes a specific regulatory requirement or safety principle, mapped to detection logic and response actions.
- **Policy effectiveness**: Measure by false positive rate (blocking safe actions) and false negative rate (missing unsafe actions). Both should be tracked.
- **Policy lifecycle**: Policies should be reviewed quarterly, updated when regulations change, and tested against adversarial scenarios.

Recommended resources:
- NIST AI RMF Playbook: https://airc.nist.gov/AI_RMF_Playbook
- EU AI Act Compliance Checklist: https://artificialintelligenceact.eu/`,

  performance: `
=== AI Safety Pipeline Performance ===
Performance metrics indicate whether safety checks can keep up with production traffic:
- **Latency budgets**: Safety checks must complete within the overall request latency budget. P95 > 500ms may degrade user experience; P99 > 2s may trigger timeouts.
- **Embedding latency**: Time to convert inputs into vector representations for safety classification. Spikes may indicate model loading issues or resource contention.
- **LLM reasoning latency**: Time for the safety model to evaluate agent actions. Higher complexity requests (multi-step reasoning) naturally take longer.
- **Throughput**: Requests per hour should match or exceed production traffic. Drops indicate capacity issues.

Recommended resources:
- Google SRE Book (latency concepts): https://sre.google/sre-book/monitoring-distributed-systems/
- NIST AI RMF MEASURE function: https://airc.nist.gov/AI_RMF_Playbook`,

  security: `
=== AI System Security ===
Auth failures and security events require immediate attention in AI systems:
- **Attack patterns**: Geographic clustering of auth failures may indicate targeted attacks. Path-specific patterns suggest reconnaissance.
- **AI-specific threats**: AI systems face unique threats — model extraction, training data poisoning, prompt injection, and adversarial inputs.
- **Incident response**: NIST CSF requires detection, analysis, containment, eradication, and recovery steps for security events.
- **Defense in depth**: Auth failures at the API layer are just one signal. Correlate with risk signals (prompt injection, jailbreak attempts) for a complete picture.

Recommended resources:
- MITRE ATLAS (Adversarial ML): https://atlas.mitre.org/
- OWASP LLM Top 10: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework`,

  temporal: `
=== Temporal Analysis for AI Safety ===
Timeline analysis helps identify when and why safety events cluster:
- **Peak hours**: Higher traffic periods naturally produce more events, but disproportionate risk signal spikes may indicate attacks or system stress.
- **Intervention clustering**: Multiple interventions in a short window may indicate a single root cause (misconfigured agent, adversarial campaign).
- **Trend analysis**: Increasing intervention rates over time may signal model drift, policy decay, or evolving threat landscape.
- **Anomaly detection**: Compare current patterns against historical baselines to identify unusual activity.`,

  general: `
=== Glass Box Dashboard — AI Safety Overview ===

**What is this dashboard?**
The Glass Box Dashboard is an AI safety monitoring and auditing tool for the Inhibitor system. It provides real-time visibility into how AI agents are being governed — what they're trying to do, what safety policies catch, and what corrective actions are taken.

**The Glass Box Principle**: Full transparency into AI decision-making — every intervention is logged with the proposed action, the corrective action, and the reasoning. Nothing is hidden.

**Dashboard Pages**:
- Overview: KPI summary, pipeline flow visualization, risk radar, timeline, charts
- Interventions: Detailed log of every safety intervention (block/modify/flag)
- Explorer: Drill into individual requests and their event chains
- Correlation: See how risk signals relate to each other
- Performance: Latency and throughput metrics for the safety pipeline
- Security: Auth failures, attack patterns, geographic analysis
- Report: Generate compliance reports
- Comparison: Compare multiple datasets side-by-side
- History: Reload previous analysis sessions

**Inhibitor Pipeline Flow** (shown in the Radial Pipeline diagram):
Request Ingestion → Embedding → Policy Evaluation → Risk Signal Detection → Compliance Prediction → Decision (block/modify/flag/allow) → Intervention (if needed) → Safe Output

**Key metrics to watch**: Validation pass rate (overall health), intervention severity distribution (risk posture), auth failure trends (security posture).

**Industry context**: AI safety oversight is required by regulation (EU AI Act, NIST AI RMF) and industry standards (ISO 42001, SOC 2 AI criteria).

**Actionable guidance**: Based on what you see in your data, you should investigate high-severity interventions first, look for recurring policy triggers (systemic issues), monitor auth failure spikes (potential attacks), and track validation pass rate trends over time.

Recommended resources:
- Anthropic AI Safety research: https://www.anthropic.com/research
- NIST AI RMF: https://airc.nist.gov/AI_RMF_Playbook
- EU AI Act: https://artificialintelligenceact.eu/
- OWASP LLM Top 10: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- MITRE ATLAS: https://atlas.mitre.org/`,
};

export function buildChatContext(
  dataset: DatasetEntry,
  intent: ChatIntent,
  entities: Record<string, string>,
): string {
  const { stats, interventions, authFailures, requests } = dataset;
  const lines: string[] = [];

  switch (intent) {
    case 'compliance_summary': {
      lines.push('=== Compliance Summary ===');
      lines.push(`Total requests processed: ${stats.totalRequests}`);
      lines.push(`Validation pass rate: ${(stats.validationPassRate * 100).toFixed(1)}%`);
      lines.push(`Total risk signals (observations): ${stats.totalObservations}`);
      lines.push(`Total compliance checks (predictions): ${stats.totalPredictions}`);
      lines.push(`Auth failures: ${stats.totalAuthFailures}`);
      lines.push(`Interventions: ${interventions.length}`);

      // Severity breakdown
      const bySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
      for (const iv of interventions) bySeverity[iv.severity] = (bySeverity[iv.severity] || 0) + 1;
      lines.push(`\nIntervention severity: High=${bySeverity.high}, Medium=${bySeverity.medium}, Low=${bySeverity.low}`);

      // Top observations
      const topObs = Object.entries(stats.observationKeyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topObs.length > 0) {
        lines.push('\nTop risk signals:');
        for (const [key, count] of topObs) {
          lines.push(`  - ${humanizeObservation(key)}: ${count} occurrences`);
        }
      }

      // Top predictions
      const topPred = Object.entries(stats.predictionKeyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topPred.length > 0) {
        lines.push('\nTop compliance concerns:');
        for (const [key, count] of topPred) {
          lines.push(`  - ${humanizePrediction(key)}: ${count} occurrences`);
        }
      }

      // Compliance domain breakdown
      lines.push('\nCompliance domain breakdown:');
      for (const [, domain] of Object.entries(COMPLIANCE_DOMAINS)) {
        const count = domain.keys.reduce((sum, k) => sum + (stats.predictionKeyCounts[k] || 0), 0);
        if (count > 0) lines.push(`  - ${domain.label}: ${count} events`);
      }
      break;
    }

    case 'intervention_explain': {
      if (entities.request_id) {
        const match = interventions.find(iv => iv.request_id.toLowerCase() === entities.request_id);
        if (match) {
          lines.push('=== Intervention Detail ===');
          lines.push(`Request ID: ${match.request_id}`);
          lines.push(`Agent: ${match.agent_id}`);
          lines.push(`Timestamp: ${match.timestamp}`);
          lines.push(`Mode: ${match.mode}`);
          lines.push(`Policy trigger: ${match.policy_trigger}`);
          lines.push(`Severity: ${match.severity}`);
          lines.push(`Action taken: ${match.action}`);
          lines.push(`Reason: ${match.reason}`);
          lines.push(`What AI proposed: ${match.proposed_action}`);
          lines.push(`What Inhibitor did instead: ${match.corrected_action}`);
          const explanation = POLICY_EXPLANATIONS[match.policy_trigger];
          if (explanation) lines.push(`Policy explanation: ${explanation}`);
        } else {
          lines.push(`No intervention found for request ID: ${entities.request_id}`);
        }
      } else {
        lines.push('=== All Interventions ===');
        for (const iv of interventions) {
          lines.push(`\n[${iv.request_id}] ${iv.agent_id} | ${iv.severity} severity`);
          lines.push(`  Policy: ${iv.policy_trigger} | Action: ${iv.action}`);
          lines.push(`  Reason: ${iv.reason}`);
          lines.push(`  Proposed: ${iv.proposed_action}`);
          lines.push(`  Corrected: ${iv.corrected_action}`);
        }
      }
      break;
    }

    case 'agent_query': {
      lines.push('=== Agent Analysis ===');
      const byAgent: Record<string, typeof interventions> = {};
      for (const iv of interventions) {
        if (!byAgent[iv.agent_id]) byAgent[iv.agent_id] = [];
        byAgent[iv.agent_id].push(iv);
      }
      for (const [agentId, agentInterventions] of Object.entries(byAgent)) {
        const sevCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
        const policies = new Set<string>();
        for (const iv of agentInterventions) {
          sevCounts[iv.severity] = (sevCounts[iv.severity] || 0) + 1;
          policies.add(iv.policy_trigger);
        }
        lines.push(`\nAgent: ${agentId}`);
        lines.push(`  Total interventions: ${agentInterventions.length}`);
        lines.push(`  Severity: High=${sevCounts.high}, Medium=${sevCounts.medium}, Low=${sevCounts.low}`);
        lines.push(`  Policies triggered: ${[...policies].join(', ')}`);
      }
      break;
    }

    case 'risk_signals': {
      lines.push('=== Risk Signals (Observations) ===');
      const sortedObs = Object.entries(stats.observationKeyCounts)
        .sort((a, b) => b[1] - a[1]);
      for (const [key, count] of sortedObs) {
        lines.push(`  - ${humanizeObservation(key)}: ${count}`);
      }

      lines.push('\n=== Compliance Predictions ===');
      const sortedPred = Object.entries(stats.predictionKeyCounts)
        .sort((a, b) => b[1] - a[1]);
      for (const [key, count] of sortedPred) {
        lines.push(`  - ${humanizePrediction(key)}: ${count}`);
      }
      break;
    }

    case 'policy_explain': {
      const trigger = entities.policy_trigger;
      if (trigger) {
        const explanation = POLICY_EXPLANATIONS[trigger];
        const matching = interventions.filter(iv => iv.policy_trigger === trigger);
        lines.push(`=== Policy: ${trigger} ===`);
        if (explanation) lines.push(`Description: ${explanation}`);
        lines.push(`Times triggered: ${matching.length}`);
        for (const iv of matching) {
          lines.push(`\n  [${iv.request_id}] Agent: ${iv.agent_id}, Severity: ${iv.severity}`);
          lines.push(`  Reason: ${iv.reason}`);
          lines.push(`  Proposed: ${iv.proposed_action}`);
          lines.push(`  Corrected: ${iv.corrected_action}`);
        }
      } else {
        // List all policies
        const policyCounts: Record<string, number> = {};
        for (const iv of interventions) {
          policyCounts[iv.policy_trigger] = (policyCounts[iv.policy_trigger] || 0) + 1;
        }
        lines.push('=== All Policies ===');
        for (const [policy, count] of Object.entries(policyCounts)) {
          const explanation = POLICY_EXPLANATIONS[policy] || '';
          lines.push(`  ${policy}: ${count} triggers${explanation ? ` - ${explanation}` : ''}`);
        }
      }
      break;
    }

    case 'performance': {
      lines.push('=== Performance Metrics ===');
      lines.push(`Total events: ${stats.totalEvents}`);
      lines.push(`Total requests: ${stats.totalRequests}`);
      lines.push(`Average request duration: ${stats.avgRequestDuration.toFixed(0)}ms`);
      lines.push(`Average events per request: ${stats.avgEventsPerRequest.toFixed(1)}`);

      const embStats = computeLatencyStats(stats.embeddingLatencies);
      lines.push(`\nEmbedding latency: min=${embStats.min}ms, median=${embStats.median}ms, p95=${embStats.p95}ms, p99=${embStats.p99}ms, max=${embStats.max}ms`);

      const llmStats = computeLatencyStats(stats.llmLatencies);
      lines.push(`LLM reasoning latency: min=${llmStats.min}ms, median=${llmStats.median}ms, p95=${llmStats.p95}ms, p99=${llmStats.p99}ms, max=${llmStats.max}ms`);

      lines.push(`\nRequests per hour:`);
      for (const { hour, count } of stats.requestsPerHour) {
        lines.push(`  ${hour}: ${count} requests`);
      }
      break;
    }

    case 'security': {
      lines.push('=== Security Events ===');
      lines.push(`Total auth failures: ${stats.totalAuthFailures}`);
      if (authFailures.length > 0) {
        const byCountry: Record<string, number> = {};
        const byPath: Record<string, number> = {};
        for (const af of authFailures) {
          byCountry[af.country] = (byCountry[af.country] || 0) + 1;
          byPath[af.path] = (byPath[af.path] || 0) + 1;
        }
        lines.push('\nAttempts by country:');
        for (const [country, count] of Object.entries(byCountry).sort((a, b) => b[1] - a[1])) {
          lines.push(`  - ${country}: ${count}`);
        }
        lines.push('\nTargeted paths:');
        for (const [path, count] of Object.entries(byPath).sort((a, b) => b[1] - a[1])) {
          lines.push(`  - ${path}: ${count}`);
        }
        lines.push('\nRecent auth failures:');
        for (const af of authFailures.slice(0, 5)) {
          lines.push(`  [${af.timestamp.toISOString()}] IP: ${af.ip} (${af.country}) -> ${af.method} ${af.path}`);
        }
      }
      break;
    }

    case 'temporal': {
      lines.push('=== Timeline Overview ===');
      lines.push(`Data spans: ${stats.timeSpanStart.toISOString()} to ${stats.timeSpanEnd.toISOString()}`);
      lines.push(`\nRequests per hour:`);
      for (const { hour, count } of stats.requestsPerHour) {
        lines.push(`  ${hour}: ${count} requests`);
      }
      lines.push(`\nInterventions timeline:`);
      for (const iv of interventions) {
        lines.push(`  [${iv.timestamp}] ${iv.agent_id}: ${iv.policy_trigger} (${iv.severity}) - ${iv.action}`);
      }
      break;
    }

    default: {
      // General: compact overview
      lines.push('=== Dashboard Overview ===');
      lines.push(`Requests: ${stats.totalRequests} | Events: ${stats.totalEvents}`);
      lines.push(`Validation pass rate: ${(stats.validationPassRate * 100).toFixed(1)}%`);
      lines.push(`Observations: ${stats.totalObservations} | Predictions: ${stats.totalPredictions}`);
      lines.push(`Auth failures: ${stats.totalAuthFailures}`);
      lines.push(`Interventions: ${interventions.length}`);
      lines.push(`Avg request duration: ${stats.avgRequestDuration.toFixed(0)}ms`);

      if (interventions.length > 0) {
        lines.push('\nIntervention summary:');
        for (const iv of interventions) {
          lines.push(`  [${iv.request_id}] ${iv.agent_id}: ${iv.policy_trigger} (${iv.severity})`);
        }
      }
      break;
    }
  }

  // Append domain knowledge for richer, more resourceful answers
  const knowledge = DOMAIN_KNOWLEDGE[intent] || DOMAIN_KNOWLEDGE.general;
  if (knowledge) {
    lines.push('\n' + knowledge.trim());
  }

  return lines.join('\n');
}
