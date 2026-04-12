export type CompanionMode = "research" | "learning" | "retention";
export type ConversationRole = "system" | "user" | "assistant";
export type EvidenceSourceType = "local_corpus" | "openalex";
export type DecisionType =
  | "allow"
  | "revise"
  | "ask_clarifying_question"
  | "block_action"
  | "escalate";
export type VerifierName =
  | "grounding"
  | "anti_sycophancy"
  | "learning"
  | "action"
  | "emotional_calibration"
  | "privacy_policy";
export type VerifierVerdict = "pass" | "warn" | "fail";
export type RecommendedAction = DecisionType;
export type UnderstandingLevel = "low" | "partial" | "strong";
export type ScenarioCategory =
  | "confidently_wrong"
  | "sycophancy"
  | "unsafe_action"
  | "emotional_miscalibration"
  | "privacy_policy"
  | "learning_validation";
export type HarnessEvaluationVariant =
  | "baseline"
  | "no_harness"
  | "full_harness";

export interface ConversationTurn {
  role: ConversationRole;
  content: string;
}

export interface EvidenceRecord {
  id: string;
  title: string;
  source_type: EvidenceSourceType;
  snippet: string;
  url: string;
  score: number;
  authors?: string[];
  published_year?: number;
  venue?: string;
  canonical_url?: string;
}

export interface CitationRecord {
  evidence_id: string;
  label: string;
  title: string;
  url: string;
}

export interface PublicResourceRecord {
  evidence_id: string;
  title: string;
  url: string;
  label: string;
  kind: "citation" | "further_reading";
  snippet: string;
  authors?: string[];
  published_year?: number;
  venue?: string;
}

export interface DraftClaim {
  text: string;
  evidence_ref_ids: string[];
  certainty: "low" | "medium" | "high";
}

export interface StudentModelSummary {
  understanding_level: UnderstandingLevel;
  misconceptions: string[];
  missing_steps: string[];
}

export interface ProposedAction {
  type: string;
  target: string;
  details: string;
  requires_confirmation: boolean;
}

export interface PrimaryAgentDraft {
  answer: string;
  claims: DraftClaim[];
  citations_used: string[];
  recommended_resource_ids?: string[];
  student_model: StudentModelSummary;
  proposed_actions: ProposedAction[];
  uncertainty_notes: string[];
}

export interface RuntimeMetadata {
  backend: string;
  agent: string;
  session_id: string;
  degraded: boolean;
  failure_type?: string;
}

export interface AttachmentReference {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
}

export interface RevisionRequirement {
  verifier_name: VerifierName;
  issue_type: string;
  rationale: string;
  risk_score: number;
  recommended_action: RecommendedAction;
  optional_rewritten_guidance?: string;
}

export interface RevisionBrief {
  original_user_message: string;
  current_answer: string;
  pass_index: number;
  requirements: RevisionRequirement[];
}

export type InternalProcessParticipant =
  | "pipeline"
  | "orchestrator"
  | "primary_agent"
  | "inhibitor"
  | "grounding_verifier"
  | "anti_sycophancy_verifier"
  | "learning_verifier"
  | "action_verifier"
  | "emotional_calibration_verifier"
  | "privacy_policy_verifier";

export interface ProcessEvent {
  id: string;
  participant: InternalProcessParticipant;
  stage: string;
  title: string;
  body: string;
  created_at: string;
}

export interface SessionSummary {
  session_id: string;
  mode: CompanionMode;
  title: string;
  preview: string;
  touched_at: string;
}

export interface SessionWorkspaceEntry extends SessionSummary {
  created_at: string;
  folder: string | null;
  archived_at: string | null;
}

export interface SessionMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AttachmentReference[];
  result?: CompanionPipelineResult;
  diagnostics_path?: string;
  timestamp: string;
}

export interface SessionWorkspaceDetail {
  session: SessionWorkspaceEntry;
  thread: SessionMessageRecord[];
}

export interface SessionWorkspaceList {
  folders: string[];
  sessions: SessionWorkspaceEntry[];
}

export type ProcessParticipant =
  | "user"
  | "pipeline"
  | "orchestrator"
  | "primary_agent"
  | "inhibitor"
  | "grounding_verifier"
  | "anti_sycophancy_verifier"
  | "learning_verifier"
  | "action_verifier"
  | "emotional_calibration_verifier"
  | "privacy_policy_verifier";

export interface ProcessMessage {
  id: string;
  participant: ProcessParticipant;
  title: string;
  body: string;
  created_at: string;
}

export interface PrimaryAgentResult {
  draft: PrimaryAgentDraft;
  runtime: RuntimeMetadata;
}

export interface VerifierJudgment {
  verifier_name: VerifierName;
  verdict: VerifierVerdict;
  risk_score: number;
  issue_type: string;
  rationale: string;
  evidence_refs: string[];
  recommended_action: RecommendedAction;
  optional_rewritten_guidance?: string;
}

export interface OrchestratorDecision {
  decision: DecisionType;
  blocking_reasons: string[];
  revision_notes: string[];
  verifier_summary: string[];
}

export interface InhibitorResult {
  blocked: boolean;
  reasons: string[];
  raw: unknown;
}

export interface RunCompanionRequest {
  session_id: string;
  mode: CompanionMode;
  user_message: string;
  attachments?: AttachmentReference[];
  show_process?: boolean;
}

export interface PrimaryAgentInput {
  request_id: string;
  session_id: string;
  mode: CompanionMode;
  user_message: string;
  conversation: ConversationTurn[];
  evidence: EvidenceRecord[];
  attachments?: AttachmentReference[];
  revision_brief?: RevisionBrief;
}

export interface VerifierInput {
  request_id: string;
  session_id: string;
  mode: CompanionMode;
  user_message: string;
  conversation: ConversationTurn[];
  evidence: EvidenceRecord[];
  attachments?: AttachmentReference[];
  draft: PrimaryAgentDraft;
  revision_brief?: RevisionBrief;
}

export interface SynthesisInput {
  mode: CompanionMode;
  user_message: string;
  draft: PrimaryAgentDraft;
  evidence: EvidenceRecord[];
  judgments: VerifierJudgment[];
  decision: OrchestratorDecision;
}

export interface SynthesisResult {
  final_answer: string;
  citations: string[];
  citation_records?: CitationRecord[];
  public_resources?: PublicResourceRecord[];
  uncertainty_notes: string[];
}

export interface SessionStore {
  readSession(sessionId: string): Promise<ConversationTurn[]>;
  appendTurns(sessionId: string, turns: ConversationTurn[]): Promise<void>;
}

export interface AuditEvent {
  request_id: string;
  stage: string;
  payload: unknown;
  created_at: string;
}

export type AuditWriter = (event: AuditEvent) => Promise<void>;
export type InhibitorFn = (input: {
  mode: CompanionMode;
  conversation: ConversationTurn[];
}) => Promise<InhibitorResult>;
export type RetrievalFn = (query: string) => Promise<EvidenceRecord[]>;
export type PrimaryAgentFn = (input: PrimaryAgentInput) => Promise<PrimaryAgentResult>;
export type RunVerifiersFn = (input: VerifierInput) => Promise<VerifierJudgment[]>;
export type SynthesisFn = (input: SynthesisInput) => Promise<SynthesisResult>;

export interface PipelineDependencies {
  inhibitor?: InhibitorFn;
  retrieveLocalEvidence?: RetrievalFn;
  retrieveOpenAlexEvidence?: RetrievalFn;
  primaryAgent?: PrimaryAgentFn;
  runVerifiers?: RunVerifiersFn;
  synthesize?: SynthesisFn;
  auditWriter?: AuditWriter;
  sessionStore?: SessionStore;
  runFixLoop?: (
    initialDraft: PrimaryAgentDraft,
    initialJudgments: VerifierJudgment[],
    input: VerifierInput,
    primaryAgent: PrimaryAgentFn,
    runSingleVerifier: (name: VerifierName, input: VerifierInput) => Promise<VerifierJudgment>
  ) => Promise<FixLoopResult>;
}

export interface CompanionPipelineResult {
  request_id: string;
  session_id: string;
  mode: CompanionMode;
  inhibitor: InhibitorResult;
  evidence: EvidenceRecord[];
  draft: PrimaryAgentDraft | null;
  runtime?: RuntimeMetadata;
  judgments: VerifierJudgment[];
  decision: OrchestratorDecision;
  synthesis: SynthesisResult;
  audit_trail: AuditEvent[];
  process_events: ProcessEvent[];
  revision_brief?: RevisionBrief;
}

export interface EvaluationScenario {
  id: string;
  category: ScenarioCategory;
  mode: CompanionMode;
  user_message: string;
  evidence: EvidenceRecord[];
  mock_draft: PrimaryAgentDraft;
  blocked_by_inhibitor?: boolean;
  expected: {
    decision: DecisionType;
    verifier_verdicts?: Partial<Record<VerifierName, VerifierVerdict>>;
  };
}

export interface EvaluationScenarioResult {
  scenario_id: string;
  category: ScenarioCategory;
  expected_decision: DecisionType;
  actual_decision: DecisionType;
  matched: boolean;
  verifier_matches: Partial<Record<VerifierName, boolean>>;
}

export interface EvaluationHarnessResult {
  variant: HarnessEvaluationVariant;
  summary: {
    total_scenarios: number;
    expectation_matches: number;
  };
  results: EvaluationScenarioResult[];
}

export const REQUIRED_VERIFIER_NAMES: VerifierName[] = [
  "grounding",
  "anti_sycophancy",
  "learning",
  "action",
  "emotional_calibration",
  "privacy_policy"
];

export interface FixAttempt {
  verifier_name: VerifierName;
  original_judgment: VerifierJudgment;
  fix_applied: boolean;
  revised_draft: PrimaryAgentDraft;
  recheck_judgment: VerifierJudgment;
}

export interface FixLoopResult {
  final_draft: PrimaryAgentDraft;
  fix_attempts: FixAttempt[];
  judgments_after_fix: VerifierJudgment[];
}
