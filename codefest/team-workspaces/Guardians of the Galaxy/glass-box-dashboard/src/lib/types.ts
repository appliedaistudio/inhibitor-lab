// ---- CSV Log Types ----

export interface RawLogRow {
  rowIndex: number;
  timestamp: string;
  apiKey: string;
  event: string;
  meta: Record<string, unknown>;
}

export type EventCategory =
  | 'embedding'
  | 'llm'
  | 'observation'
  | 'prediction'
  | 'rules'
  | 'validation'
  | 'request'
  | 'auth';

export interface ParsedLogEvent {
  rowIndex: number;
  timestamp: Date;
  apiKey: string;
  event: string;
  category: EventCategory;
  meta: Record<string, unknown>;
  humanLabel: string;
}

export interface RequestLifecycle {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  apiKey: string;
  events: ParsedLogEvent[];
  eventCount: number;
  observations: ObservationEvent[];
  predictions: PredictionEvent[];
  ruleResults: RuleResult[];
  validationPassed: boolean;
  embeddingCount: number;
  llmCount: number;
}

export interface ObservationEvent {
  key: string;
  length: number;
  timestamp: Date;
}

export interface PredictionEvent {
  key: string;
  length: number;
  timestamp: Date;
}

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  missingVariables: string[];
  missingBindings: string[];
}

// ---- JSONL Intervention Types ----

export interface InterventionEvent {
  timestamp: string;
  agent_id: string;
  request_id: string;
  mode: string;
  policy_trigger: string;
  severity: string;
  action: string;
  reason: string;
  proposed_action: string;
  corrected_action: string;
}

// ---- Auth Failure Types ----

export interface AuthFailure {
  timestamp: Date;
  path: string;
  method: string;
  ip: string;
  country: string;
  userAgent: string;
  host: string;
}

// ---- Computed Stats ----

export interface DashboardStats {
  totalEvents: number;
  totalRequests: number;
  totalObservations: number;
  totalPredictions: number;
  totalAuthFailures: number;
  validationPassRate: number;
  avgRequestDuration: number;
  avgEventsPerRequest: number;
  timeSpanStart: Date;
  timeSpanEnd: Date;
  eventTypeCounts: Record<string, number>;
  observationKeyCounts: Record<string, number>;
  predictionKeyCounts: Record<string, number>;
  embeddingLatencies: number[];
  llmLatencies: number[];
  requestsPerHour: { hour: string; count: number }[];
}

export interface LatencyStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

// ---- App State ----

export type TabId = 'overview' | 'interventions' | 'explorer' | 'correlation' | 'performance' | 'security' | 'comparison' | 'history' | 'new-session' | 'chatbot';

export type DatasetId = string;

export interface DatasetEntry {
  id: string;
  name: string;
  events: ParsedLogEvent[];
  requests: RequestLifecycle[];
  authFailures: AuthFailure[];
  interventions: InterventionEvent[];
  stats: DashboardStats;
}

// ---- Chatbot Types ----

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

export type ChatIntent =
  | 'compliance_summary'
  | 'intervention_explain'
  | 'agent_query'
  | 'risk_signals'
  | 'policy_explain'
  | 'performance'
  | 'security'
  | 'temporal'
  | 'general';
