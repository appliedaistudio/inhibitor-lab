import type { IconName } from "./icons";

export type RunState =
  | "allowed"
  | "flagged"
  | "blocked"
  | "escalated"
  | "human-reviewed";

export type HealthTone = "stable" | "watching" | "action";
export type PolicySeverity = "low" | "medium" | "high" | "critical";
export type AlertTone = "info" | "warning" | "critical";

export type NavItem = {
  id: string;
  label: string;
  helper: string;
  icon: IconName;
};

export type HealthMetric = {
  label: string;
  value: string;
  detail: string;
  tone: HealthTone;
};

export type LiveRun = {
  id: string;
  agent: string;
  summary: string;
  model: string;
  environment: string;
  risk: number;
  state: RunState;
  policy: string;
  updatedAt: string;
};

export type TraceStep = {
  id: string;
  title: string;
  input: string;
  action: string;
  confidence: string;
  checks: string[];
  outcome: string;
  state: RunState;
  snippet?: string;
};

export type PolicyDetail = {
  name: string;
  severity: PolicySeverity;
  rationale: string;
  logic: string;
  action: string;
  owner: string;
};

export type DecisionTrace = {
  runId: string;
  timestamp: string;
  model: string;
  environment: string;
  riskScore: number;
  inhibitorStepId: string;
  policy: PolicyDetail;
  steps: TraceStep[];
};

export type PolicyViolation = {
  id: string;
  policy: string;
  description: string;
  severity: PolicySeverity;
  environment: string;
  target: string;
  triggeredAt: string;
};

export type InterventionRecord = {
  id: string;
  runId: string;
  operator: string;
  action: string;
  reason: string;
  timestamp: string;
  state: RunState;
};

export type AlertItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: AlertTone;
  priority: string;
  owner: string;
  nextAction: string;
};

export const navigation: NavItem[] = [
  { id: "overview", label: "Overview", helper: "Runtime summary", icon: "overview" },
  { id: "runs", label: "Runs", helper: "Active agents", icon: "runs" },
  { id: "policies", label: "Policies", helper: "Guardrails and scope", icon: "policies" },
  {
    id: "interventions",
    label: "Interventions",
    helper: "Operator decisions",
    icon: "interventions",
  },
  {
    id: "evaluations",
    label: "Evaluations",
    helper: "Risk and signal quality",
    icon: "evaluations",
  },
  { id: "audit", label: "Audit Log", helper: "Review history", icon: "audit" },
  { id: "settings", label: "Settings", helper: "Controls and access", icon: "settings" },
];

export const healthSummary: HealthMetric[] = [
  {
    label: "Guardrail coverage",
    value: "97.4%",
    detail: "Stable across production agents",
    tone: "stable",
  },
  {
    label: "Median decision latency",
    value: "142 ms",
    detail: "Within intervention budget",
    tone: "stable",
  },
  {
    label: "Runs needing review",
    value: "03",
    detail: "Two warning, one escalated",
    tone: "watching",
  },
];

export const liveRuns: LiveRun[] = [
  {
    id: "RUN-20418",
    agent: "Claims Triage Orchestrator",
    summary:
      "Preparing a denial explanation for a high-value reimbursement request after conflicting evidence was retrieved from the policy store.",
    model: "gpt-5.4",
    environment: "Production",
    risk: 72,
    state: "escalated",
    policy: "Benefit.AdverseAction.Explanation",
    updatedAt: "2 min ago",
  },
  {
    id: "RUN-20412",
    agent: "Support Resolution Agent",
    summary:
      "Attempted to include full account metadata in an outbound reply before the inhibitor blocked the response boundary.",
    model: "gpt-5.4-mini",
    environment: "Production",
    risk: 89,
    state: "blocked",
    policy: "PII.Outbound.Account",
    updatedAt: "6 min ago",
  },
  {
    id: "RUN-20405",
    agent: "Vendor Intake Assistant",
    summary:
      "Requested a human reviewer after confidence dropped while comparing sanctions screening results from two upstream tools.",
    model: "gpt-5.4-mini",
    environment: "Staging",
    risk: 48,
    state: "human-reviewed",
    policy: "Vendor.Screening.Inconsistency",
    updatedAt: "12 min ago",
  },
];

export const policyViolations: PolicyViolation[] = [
  {
    id: "POL-18",
    policy: "PII.Outbound.Account",
    description:
      "Detected an outbound reply containing unmasked financial identifiers beyond allowed support verification rules.",
    severity: "critical",
    environment: "Production",
    target: "Support Resolution Agent",
    triggeredAt: "6 min ago",
  },
  {
    id: "POL-11",
    policy: "Benefit.AdverseAction.Explanation",
    description:
      "Confidence fell below the explanation threshold after the model produced conflicting reasoning for a customer-facing denial.",
    severity: "high",
    environment: "Production",
    target: "Claims Triage Orchestrator",
    triggeredAt: "2 min ago",
  },
  {
    id: "POL-07",
    policy: "Vendor.Screening.Inconsistency",
    description:
      "Sanctions-match disagreement between tools forced the run into assisted review before vendor onboarding could continue.",
    severity: "medium",
    environment: "Staging",
    target: "Vendor Intake Assistant",
    triggeredAt: "12 min ago",
  },
  {
    id: "POL-03",
    policy: "Escalation.Absence.Requirement",
    description:
      "The model proposed a manual override path without attaching a reviewer rationale, so the action was flagged before dispatch.",
    severity: "medium",
    environment: "Production",
    target: "Support Resolution Agent",
    triggeredAt: "19 min ago",
  },
];

export const interventionLog: InterventionRecord[] = [
  {
    id: "INT-903",
    runId: "RUN-20418",
    operator: "N. Patel",
    action: "Escalated to licensed claims reviewer",
    reason: "Conflicting evidence and low confidence in adverse-action explanation",
    timestamp: "2026-04-11 15:42",
    state: "escalated",
  },
  {
    id: "INT-899",
    runId: "RUN-20412",
    operator: "System / Inhibitor",
    action: "Blocked outbound response",
    reason: "Detected unmasked account identifier in response draft",
    timestamp: "2026-04-11 15:38",
    state: "blocked",
  },
  {
    id: "INT-891",
    runId: "RUN-20405",
    operator: "M. Chen",
    action: "Reviewed and approved hold",
    reason: "Required documentation aligned with vendor sanctions workflow",
    timestamp: "2026-04-11 15:31",
    state: "human-reviewed",
  },
];

export const alertStream: AlertItem[] = [
  {
    id: "ALT-12",
    title: "Critical outbound PII event blocked",
    detail:
      "A production support run attempted to send full account metadata externally. The response boundary was stopped before delivery.",
    timestamp: "Just now",
    tone: "critical",
    priority: "P1 / Immediate review",
    owner: "Trust Engineering",
    nextAction: "Confirm the blocked response stayed unsent and tune detection examples.",
  },
  {
    id: "ALT-09",
    title: "Adverse-action reasoning escalated",
    detail:
      "Claims Triage Orchestrator entered assisted review because evidence retrieval and model rationale no longer agreed.",
    timestamp: "2 min ago",
    tone: "warning",
    priority: "P2 / Same-hour follow-up",
    owner: "Claims Operations",
    nextAction: "Review the evidence packet and approve or revise the customer explanation.",
  },
  {
    id: "ALT-05",
    title: "Reviewer note missing on override path",
    detail:
      "A manual override was proposed without the required reviewer note, causing the workflow to pause before execution.",
    timestamp: "19 min ago",
    tone: "info",
    priority: "P3 / Queue review",
    owner: "Platform Safety",
    nextAction: "Attach required rationale or close the override request.",
  },
];

export const decisionTraces: DecisionTrace[] = [
  {
    runId: "RUN-20418",
    timestamp: "2026-04-11 15:42 EDT",
    model: "gpt-5.4",
    environment: "Production / us-east-1",
    riskScore: 72,
    inhibitorStepId: "step-3",
    policy: {
      name: "Benefit.AdverseAction.Explanation",
      severity: "high",
      rationale:
        "Customer-facing denial decisions require aligned evidence, a complete explanation, and human escalation when confidence falls below the approved threshold.",
      logic:
        "IF action = adverse_explanation AND confidence < 0.82 THEN escalate_to_human_review",
      action: "Pause outbound reply and route to licensed reviewer with evidence bundle attached.",
      owner: "Claims Safety Council",
    },
    steps: [
      {
        id: "step-1",
        title: "Retrieve evidence",
        input:
          "Loaded reimbursement policy excerpt, claim notes, and tool output from fraud scoring and benefits eligibility.",
        action: "Assembled a structured evidence packet for explanation generation.",
        confidence: "0.91",
        checks: ["Evidence completeness", "Policy bundle version match"],
        outcome: "Evidence packet built successfully",
        state: "allowed",
      },
      {
        id: "step-2",
        title: "Draft customer explanation",
        input:
          "Model generated a denial explanation citing an eligibility exclusion, but the fraud score contradicted the stated reason.",
        action: "Produced a narrative explanation with unresolved conflict markers.",
        confidence: "0.78",
        checks: ["Consistency between evidence and rationale", "Adverse-action explanation threshold"],
        outcome: "Flagged for low-confidence rationale",
        state: "flagged",
        snippet:
          "reasoning_conflict: fraud_score suggests duplicate billing\nexplanation_draft: denial due to eligibility exclusion",
      },
      {
        id: "step-3",
        title: "Inhibitor review",
        input:
          "Inhibitor evaluated the draft explanation, confidence score, and evidence mismatch against adverse-action controls.",
        action: "Escalated the run before the explanation could be sent.",
        confidence: "Policy trigger / deterministic",
        checks: ["Confidence below threshold", "Human review required", "Outbound message hold"],
        outcome: "Inhibitor engaged and routed to human review",
        state: "escalated",
      },
      {
        id: "step-4",
        title: "Operator handoff",
        input:
          "Run package was transferred to the licensed claims review queue with evidence, rationale draft, and trigger summary attached.",
        action: "Created a human review task and suspended the run.",
        confidence: "1.00",
        checks: ["Audit artifact attached", "Queue ownership assigned"],
        outcome: "Awaiting reviewer decision",
        state: "human-reviewed",
      },
    ],
  },
  {
    runId: "RUN-20412",
    timestamp: "2026-04-11 15:38 EDT",
    model: "gpt-5.4-mini",
    environment: "Production / us-east-1",
    riskScore: 89,
    inhibitorStepId: "step-3",
    policy: {
      name: "PII.Outbound.Account",
      severity: "critical",
      rationale:
        "No production support workflow may expose unmasked account identifiers or financial metadata in outbound user-facing messages.",
      logic:
        "IF outbound_contains(account_number OR routing_number) THEN block_response AND log_intervention",
      action: "Block message, preserve evidence snippet, and require safe redraft.",
      owner: "Trust Engineering",
    },
    steps: [
      {
        id: "step-1",
        title: "Collect customer context",
        input:
          "Support run assembled the latest ticket, verification notes, and account summary to answer a billing question.",
        action: "Prepared a context packet for final response drafting.",
        confidence: "0.95",
        checks: ["Identity state check", "Context freshness"],
        outcome: "Context packet assembled",
        state: "allowed",
      },
      {
        id: "step-2",
        title: "Draft outbound message",
        input:
          "The model attempted to include a full account identifier in the response to help the customer confirm the record.",
        action: "Prepared a response that exceeded permitted disclosure boundaries.",
        confidence: "0.88",
        checks: ["Outbound content scan", "Sensitive field detection"],
        outcome: "Sensitive content detected",
        state: "flagged",
        snippet:
          "draft_response: We located account 8831-4421-0067 and can confirm the billing profile attached to it.",
      },
      {
        id: "step-3",
        title: "Inhibitor review",
        input:
          "The response draft was passed through the outbound disclosure policy set before leaving the boundary.",
        action: "Hard-blocked the response and recorded the exact detection evidence.",
        confidence: "Policy trigger / deterministic",
        checks: ["Account number match", "Outbound response boundary", "Audit logging"],
        outcome: "Response blocked before send",
        state: "blocked",
      },
      {
        id: "step-4",
        title: "Safe redraft request",
        input:
          "The run requested a new reply constrained to masked identifiers and troubleshooting guidance only.",
        action: "Queued a redraft under masked-identifier rules.",
        confidence: "0.93",
        checks: ["Masking template applied", "Support guidance retained"],
        outcome: "Awaiting safe replacement draft",
        state: "flagged",
      },
    ],
  },
  {
    runId: "RUN-20405",
    timestamp: "2026-04-11 15:31 EDT",
    model: "gpt-5.4-mini",
    environment: "Staging / us-east-1",
    riskScore: 48,
    inhibitorStepId: "step-3",
    policy: {
      name: "Vendor.Screening.Inconsistency",
      severity: "medium",
      rationale:
        "When screening tools disagree on sanctions or watchlist status, the system must stop autonomous progression and request human review.",
      logic:
        "IF screening_sources_conflict = true THEN hold_vendor_progression AND request_review",
      action: "Pause onboarding workflow and attach both tool results for manual adjudication.",
      owner: "Vendor Risk",
    },
    steps: [
      {
        id: "step-1",
        title: "Run screening tools",
        input:
          "Two screening systems returned different watchlist results for the same vendor entity record.",
        action: "Normalized both tool outputs into a comparison summary.",
        confidence: "0.86",
        checks: ["Entity resolution", "Tool response normalization"],
        outcome: "Conflicting matches surfaced",
        state: "flagged",
      },
      {
        id: "step-2",
        title: "Attempt autonomous resolution",
        input:
          "The model tried to rank one source above the other based on historical confidence without an approved override path.",
        action: "Generated a recommendation but held execution.",
        confidence: "0.63",
        checks: ["Override authority", "Confidence floor"],
        outcome: "Resolution confidence too low",
        state: "flagged",
      },
      {
        id: "step-3",
        title: "Inhibitor review",
        input:
          "The comparison summary and confidence score were evaluated against vendor screening inconsistency rules.",
        action: "Forced a human review hold before onboarding continued.",
        confidence: "Policy trigger / deterministic",
        checks: ["Tool disagreement", "Human review requirement"],
        outcome: "Hold placed on vendor progression",
        state: "human-reviewed",
      },
    ],
  },
];
