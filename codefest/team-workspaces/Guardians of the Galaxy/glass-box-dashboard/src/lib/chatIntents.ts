import type { ChatIntent } from './types';

interface IntentResult {
  intent: ChatIntent;
  entities: Record<string, string>;
}

const INTENT_PATTERNS: { intent: ChatIntent; keywords: string[] }[] = [
  {
    intent: 'intervention_explain',
    keywords: ['why', 'blocked', 'interrupted', 'intervention', 'stopped', 'prevented', 'what happened to'],
  },
  {
    intent: 'compliance_summary',
    keywords: ['compliant', 'compliance', 'overall', 'summary', 'risk posture', 'status', 'health', 'pass rate', 'validation'],
  },
  {
    intent: 'agent_query',
    keywords: ['agent', 'finance-agent', 'privacy-agent', 'ops-agent', 'which agent', 'agent-alpha', 'agent-beta', 'agent-gamma'],
  },
  {
    intent: 'risk_signals',
    keywords: ['bias', 'risk signal', 'observation', 'pii', 'data handling', 'jailbreak', 'harmful', 'unsafe', 'risk radar', 'top risk', 'pattern'],
  },
  {
    intent: 'policy_explain',
    keywords: ['policy', 'fin-', 'gdpr-', 'sec-', 'trigger', 'rule explain'],
  },
  {
    intent: 'performance',
    keywords: ['latency', 'fast', 'slow', 'duration', 'performance', 'speed', 'how long', 'millisecond', 'p95', 'p99'],
  },
  {
    intent: 'security',
    keywords: ['security', 'auth', 'unauthorized', 'attack', 'probe', 'hack', 'invalid key', 'failed login'],
  },
  {
    intent: 'temporal',
    keywords: ['between', 'before', 'after', 'recent', 'latest', 'last hour', 'today', 'morning', 'afternoon', 'timeline', 'request over time', 'requests over time', 'per hour', 'traffic', 'volume'],
  },
  {
    // General/dashboard/architecture questions → falls to 'general' intent which has full dashboard + system knowledge
    intent: 'general',
    keywords: ['dashboard', 'what is this', 'explain this', 'how does this work', 'flow', 'pipeline', 'what does', 'website', 'page', 'chart', 'graph', 'radial', 'kpi', 'cards', 'overview', 'how to use', 'navigate', 'architecture', 'stages', 'system', 'inhibitor', 'glass box', 'what are', 'tell me about', 'describe', 'show me', 'help me understand', 'what is the', 'how do i'],
  },
];

const REQUEST_ID_RE = /req-\d+/i;
const AGENT_ID_RE = /(finance-agent-alpha|privacy-agent-beta|ops-agent-gamma)/i;
const POLICY_RE = /(FIN-[A-Z-]+|GDPR-[A-Z-]+|SEC-[A-Z-]+)/i;

export function detectIntent(message: string): IntentResult {
  const lower = message.toLowerCase();
  const entities: Record<string, string> = {};

  // Extract entities
  const reqMatch = message.match(REQUEST_ID_RE);
  if (reqMatch) entities.request_id = reqMatch[0].toLowerCase();

  const agentMatch = message.match(AGENT_ID_RE);
  if (agentMatch) entities.agent_id = agentMatch[1].toLowerCase();

  const policyMatch = message.match(POLICY_RE);
  if (policyMatch) entities.policy_trigger = policyMatch[1].toUpperCase();

  // If a specific request ID is mentioned, it's an intervention explanation
  if (entities.request_id) {
    return { intent: 'intervention_explain', entities };
  }

  // If a specific policy trigger is mentioned, it's a policy explanation
  if (entities.policy_trigger) {
    return { intent: 'policy_explain', entities };
  }

  // Score each intent by keyword matches
  let bestIntent: ChatIntent = 'general';
  let bestScore = 0;

  for (const { intent, keywords } of INTENT_PATTERNS) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return { intent: bestIntent, entities };
}
