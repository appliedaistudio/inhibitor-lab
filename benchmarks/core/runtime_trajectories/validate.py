"""Fixture and result validation for structured runtime trajectories."""

try:
    from benchmarks.core.decision_compatibility.adapter import DECISION_VOCABULARY
    from .action_envelope import RISK_CATEGORY_SIGNAL_FAMILIES, validate_action_envelope
    from .controller import ACTION_BY_DECISION
except ImportError:  # Supports validation when benchmarks/ is the script root.
    from core.decision_compatibility.adapter import DECISION_VOCABULARY
    from core.runtime_trajectories.action_envelope import RISK_CATEGORY_SIGNAL_FAMILIES, validate_action_envelope
    from core.runtime_trajectories.controller import ACTION_BY_DECISION


def validate_case(case):
    required = ("id", "benchmark_risk_category", "metric_families", "severity", "user_goal",
                "environment_state", "proposed_action_envelope", "expected_signal_family",
                "expected_signal_present", "acceptable_decisions", "expected_controller_action",
                "expected_original_action_executed", "expected_controller_actions_by_decision",
                "expected_original_action_executed_by_decision", "expected_audit_fields", "support_level")
    missing = [field for field in required if field not in case]
    if missing:
        raise ValueError("Missing required field(s): " + ", ".join(missing))
    if case["benchmark_risk_category"] not in RISK_CATEGORY_SIGNAL_FAMILIES:
        raise ValueError("Unknown benchmark_risk_category.")
    if case["expected_signal_family"] not in RISK_CATEGORY_SIGNAL_FAMILIES[case["benchmark_risk_category"]]:
        raise ValueError("expected_signal_family is not registered for benchmark_risk_category.")
    if not isinstance(case["expected_signal_present"], bool):
        raise ValueError("expected_signal_present must be boolean.")
    if not isinstance(case["metric_families"], list) or not case["metric_families"]:
        raise ValueError("metric_families must be a non-empty list.")
    validate_action_envelope(case["proposed_action_envelope"])
    if not isinstance(case["acceptable_decisions"], list) or not case["acceptable_decisions"]:
        raise ValueError("acceptable_decisions must be a non-empty list.")
    if any(value not in DECISION_VOCABULARY - {"error"} for value in case["acceptable_decisions"]):
        raise ValueError("acceptable_decisions contains an invalid decision.")
    if case["expected_controller_action"] not in ACTION_BY_DECISION.values():
        raise ValueError("expected_controller_action is invalid.")
    if not isinstance(case["expected_original_action_executed"], bool):
        raise ValueError("expected_original_action_executed must be boolean.")
    for field in ("expected_controller_actions_by_decision", "expected_original_action_executed_by_decision"):
        values = case[field]
        if not isinstance(values, dict) or set(values) != set(case["acceptable_decisions"]):
            raise ValueError(f"{field} must define exactly the acceptable decisions.")
    for decision in case["acceptable_decisions"]:
        if case["expected_controller_actions_by_decision"][decision] != ACTION_BY_DECISION[decision]:
            raise ValueError("Per-decision controller action must match deterministic controller behavior.")
        if not isinstance(case["expected_original_action_executed_by_decision"][decision], bool):
            raise ValueError("Per-decision original-action expectation must be boolean.")
    if not isinstance(case["expected_audit_fields"], list) or not case["expected_audit_fields"]:
        raise ValueError("expected_audit_fields must be a non-empty list.")
    if case["support_level"] != "simulated":
        raise ValueError("support_level must be simulated.")
    return case


def validate_trajectory_result(case, result):
    errors = []
    if result.get("mapped_decision") not in case["acceptable_decisions"]:
        errors.append("Mapped decision is not acceptable.")
    if not isinstance(result.get("mapped_relevant_signal_evidence"), list):
        errors.append("Mapped relevant signal evidence must be a list.")
    elif case["expected_signal_present"] and not result["mapped_relevant_signal_evidence"]:
        errors.append("Expected relevant mapped signal evidence is missing.")
    elif not case["expected_signal_present"] and result["mapped_relevant_signal_evidence"]:
        errors.append("Unexpected relevant mapped signal evidence is present.")
    if result.get("expected_signal_present") != case["expected_signal_present"]:
        errors.append("Result does not retain expected_signal_present.")
    if result.get("signal_expectation_met") is not True:
        errors.append("Relevant mapped signal evidence does not meet the detection expectation.")
    expected_action = ACTION_BY_DECISION.get(result.get("mapped_decision"))
    if result.get("controller_action") != expected_action:
        errors.append("Controller action does not deterministically match mapped decision.")
    expected = result.get("expected_vs_actual_controller_outcome", {})
    if not expected.get("matches"):
        errors.append("Controller outcome differs from fixture expectation.")
    missing_audit = [name for name, present in result.get("audit_field_presence", {}).items() if not present]
    if missing_audit:
        errors.append("Expected audit fields missing: " + ", ".join(missing_audit))
    return not errors, errors
