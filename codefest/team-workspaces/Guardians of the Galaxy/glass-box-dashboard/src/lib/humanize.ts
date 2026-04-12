import type { EventCategory } from './types';

/** Map raw event names to plain-English labels for non-technical reviewers */
const EVENT_LABELS: Record<string, string> = {
  embedding_start: 'Analyzing Content',
  embedding_complete: 'Content Analysis Complete',
  llm_prompt_start: 'AI Reasoning Step Started',
  llm_prompt_complete: 'AI Reasoning Step Complete',
  inhibition_observation_description_response: 'Risk Signal Detected',
  inhibition_prediction_reason_response: 'Compliance Check Triggered',
  rules_inhibition_rule_start: 'Rule Evaluation Started',
  rules_inhibition_rule_passed: 'Rule Evaluation Passed',
  rules_inhibition_rule_binding_missing: 'Missing Required Field',
  rules_extraction_value_missing: 'Missing Data Value',
  rules_inhibition_complete: 'Rule Check Complete',
  inhibition_describe_result_validation: 'Result Validated',
  inhibition_final_validation: 'Final Validation Complete',
  request_success: 'Request Received',
  auth_failed_invalid_key: 'Unauthorized Access Blocked',
};

/** Map raw observation keys to readable labels */
const OBSERVATION_LABELS: Record<string, string> = {
  ai_outputs_biased_response: 'AI Bias Detected',
  ai_processes_confidential_data: 'Confidential Data Processing',
  ai_ignores_bias: 'Bias Ignored',
  ai_applies_insecure_data_handling: 'Insecure Data Handling',
  financial_information_used: 'Financial Data Used',
  clinical_information_used: 'Clinical Data Used',
  ai_provides_invalid_or_missing_justification: 'Missing Justification',
  insurance_claims_information_used: 'Insurance Claims Data Used',
  consumer_information_used: 'Consumer Data Used',
  ai_shares_user_data_without_consent: 'Unconsented Data Sharing',
  ai_promotes_unfair_treatment: 'Unfair Treatment Promoted',
  ai_undermines_fair_decision_process: 'Fair Process Undermined',
  system_exposes_sensitive_information: 'Sensitive Info Exposed',
  ai_ignores_contextual_disparities: 'Contextual Disparities Ignored',
  ai_obscures_information: 'Information Obscured',
  business_logic_failure: 'Business Logic Failure',
  ai_misrepresents_risk: 'Risk Misrepresented',
  ai_mishandles_uncertainty: 'Uncertainty Mishandled',
  ai_compromises_dignity: 'Dignity Compromised',
  system_executes_risky_autonomous_decision: 'Risky Autonomous Decision',
  ai_fails_to_disclose_conflict: 'Conflict Not Disclosed',
  ai_outputs_harmful_instruction: 'Harmful Instruction Output',
  ai_omits_safety_notice: 'Safety Notice Omitted',
  ai_complies_with_unsafe_request: 'Unsafe Request Compliance',
  ai_executes_unsafe_instruction: 'Unsafe Instruction Executed',
  contains_internal_contradiction: 'Internal Contradiction',
  user_requests_harmful_action: 'Harmful Action Requested',
  user_requests_discriminatory_guidance: 'Discriminatory Guidance Requested',
  ai_processes_invalid_input_structure: 'Invalid Input Structure',
  is_analogous_to_known_noncredible_claim: 'Noncredible Claim Pattern',
  implies_known_noncredible_claim: 'Implied Noncredible Claim',
  aligns_with_known_noncredible_claim: 'Aligns with Noncredible Claim',
  absence_of_implied_evidence: 'Missing Evidence',
  user_requests_to_deceive_or_obscure: 'Deception Requested',
  user_attempts_jailbreak: 'Jailbreak Attempt',
  indecent_content_action: 'Indecent Content',
};

/** Map prediction reason keys to readable labels */
const PREDICTION_LABELS: Record<string, string> = {
  unfair_treatment: 'Unfair Treatment',
  eroded_trust: 'Eroded Trust',
  decision_quality_violated: 'Decision Quality Violated',
  invalid_output: 'Invalid Output',
  ai_act_violation: 'AI Act Violation',
  system_exploitation_risk: 'System Exploitation Risk',
  transparency_or_consent_violated: 'Transparency/Consent Violated',
  ccpa_violation: 'CCPA Violation',
  fairness_violated: 'Fairness Violated',
  soc2_noncompliance: 'SOC2 Non-compliance',
  privacy_violated: 'Privacy Violated',
  lgpd_violation: 'LGPD Violation',
  cfpb_violation: 'CFPB Violation',
  aml_violation: 'AML Violation',
  unsafe_autonomous_decision: 'Unsafe Autonomous Decision',
  hipaa_violation: 'HIPAA Violation',
  harm: 'Potential Harm',
  unfair_claims_practice: 'Unfair Claims Practice',
  malicious_request_detected: 'Malicious Request Detected',
  gdpr_violation: 'GDPR Violation',
  accountability_obscured: 'Accountability Obscured',
  unjustified_cost: 'Unjustified Cost',
  system_integrity_violated: 'System Integrity Violated',
  stakeholder_unawareness_risk: 'Stakeholder Unawareness Risk',
  pipeda_violation: 'PIPEDA Violation',
  safety_disregarded: 'Safety Disregarded',
  iso27001_violation: 'ISO 27001 Violation',
  control_or_autonomy_violated: 'Control/Autonomy Violated',
  public_offense: 'Public Offense',
  dignity_or_respect_violated: 'Dignity/Respect Violated',
};

/** Compliance domain groupings for prediction reasons */
export const COMPLIANCE_DOMAINS: Record<string, { label: string; color: string; keys: string[] }> = {
  financial: {
    label: 'Financial',
    color: '#ffb547',
    keys: ['cfpb_violation', 'aml_violation', 'unfair_claims_practice', 'unjustified_cost'],
  },
  privacy: {
    label: 'Privacy & Data',
    color: '#a855f7',
    keys: ['gdpr_violation', 'ccpa_violation', 'hipaa_violation', 'lgpd_violation', 'pipeda_violation', 'privacy_violated', 'transparency_or_consent_violated'],
  },
  security: {
    label: 'Security',
    color: '#ff3b5c',
    keys: ['system_exploitation_risk', 'unsafe_autonomous_decision', 'malicious_request_detected', 'safety_disregarded', 'system_integrity_violated'],
  },
  fairness: {
    label: 'Fairness & Ethics',
    color: '#00e5a0',
    keys: ['unfair_treatment', 'fairness_violated', 'dignity_or_respect_violated', 'control_or_autonomy_violated', 'public_offense'],
  },
  quality: {
    label: 'Quality & Trust',
    color: '#00d4ff',
    keys: ['eroded_trust', 'decision_quality_violated', 'invalid_output', 'ai_act_violation', 'harm', 'accountability_obscured', 'soc2_noncompliance', 'iso27001_violation', 'stakeholder_unawareness_risk'],
  },
};

export function humanizeEvent(event: string): string {
  return EVENT_LABELS[event] || event.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function humanizeObservation(key: string): string {
  return OBSERVATION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function humanizePrediction(key: string): string {
  return PREDICTION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function categorizeEvent(event: string): EventCategory {
  if (event.startsWith('embedding_')) return 'embedding';
  if (event.startsWith('llm_prompt_')) return 'llm';
  if (event.includes('observation_description')) return 'observation';
  if (event.includes('prediction_reason')) return 'prediction';
  if (event.startsWith('rules_') || event === 'inhibition_describe_result_validation') return 'rules';
  if (event.includes('final_validation')) return 'validation';
  if (event.startsWith('auth_')) return 'auth';
  return 'request';
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  embedding: '#00d4ff',
  llm: '#a855f7',
  observation: '#ffb547',
  prediction: '#ff3b5c',
  rules: '#00e5a0',
  validation: '#00d4ff',
  request: '#4a5568',
  auth: '#ff3b5c',
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  embedding: 'Content Analysis',
  llm: 'AI Reasoning',
  observation: 'Risk Signals',
  prediction: 'Compliance Checks',
  rules: 'Rule Evaluation',
  validation: 'Final Validation',
  request: 'Request',
  auth: 'Authentication',
};
