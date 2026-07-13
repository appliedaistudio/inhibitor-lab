#!/usr/bin/env python3
"""Validate benchmark suite manifest and available fixture files."""

from pathlib import Path
import json
import sys

try:
    from lib.schema import require_fields, validate_case_base, validate_support_level_value
except ImportError:  # pragma: no cover
    from benchmarks.lib.schema import require_fields, validate_case_base, validate_support_level_value

BENCHMARKS_DIR = Path(__file__).resolve().parent
REPO_ROOT = BENCHMARKS_DIR.parent
MANIFEST_PATH = BENCHMARKS_DIR / "benchmark_suite.yaml"
DECISION_VOCABULARY = {"allow", "warn", "revise", "clarify", "pause", "escalate", "block", "error"}
CONTROLLER_ACTIONS = {"approve_response", "approve_with_warning", "apply_safe_revision", "request_clarification", "pause_for_review", "route_to_review", "block_response", "record_error"}

REQUIRED_FIELDS = (
    "id",
    "name",
    "path",
    "category",
    "support_level",
    "required",
    "status",
    "description",
)


def _parse_scalar(raw_value):
    value = raw_value.strip()
    if value == "true":
        return True
    if value == "false":
        return False
    if len(value) >= 2 and value[0] == value[-1] == '"':
        return value[1:-1]
    return value


def load_suite_manifest(path=MANIFEST_PATH):
    """Load the simple benchmark suite YAML manifest without third-party dependencies."""

    # This is intentionally a minimal parser for the simple Phase 2 manifest
    # shape, not a general YAML parser. If the manifest grows more complex,
    # replace this with a documented YAML loader/dependency.
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    suites = []
    current = None
    pending_list_key = None

    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped == "suites:":
            continue
        if stripped.startswith("- ") and pending_list_key:
            current[pending_list_key].append(_parse_scalar(stripped[2:]))
            continue
        if stripped.startswith("- "):
            if current is not None:
                suites.append(current)
            current = {}
            pending_list_key = None
            key, sep, value = stripped[2:].partition(":")
            if not sep:
                raise ValueError(f"Malformed list item on line {line_number}.")
            current[key.strip()] = _parse_scalar(value)
            continue
        if current is None:
            raise ValueError(f"Unexpected content before first suite on line {line_number}.")
        key, sep, value = stripped.partition(":")
        if not sep:
            raise ValueError(f"Malformed key/value pair on line {line_number}.")
        key = key.strip()
        if value.strip() == "":
            current[key] = []
            pending_list_key = key
        else:
            current[key] = _parse_scalar(value)
            pending_list_key = None

    if current is not None:
        suites.append(current)
    return {"suites": suites}


def validate_manifest(manifest):
    """Validate manifest fields and referenced suite directories."""

    errors = []
    suites = manifest.get("suites")
    if not isinstance(suites, list) or not suites:
        return ["Manifest must contain a non-empty 'suites' list."]

    seen = set()
    for suite in suites:
        suite_id = suite.get("id", "<unknown>") if isinstance(suite, dict) else "<unknown>"
        try:
            require_fields(suite, REQUIRED_FIELDS)
            if suite["id"] in seen:
                raise ValueError(f"Duplicate suite id: {suite['id']}")
            seen.add(suite["id"])
            if suite["category"] not in {"core", "diagnostic"}:
                raise ValueError("Field 'category' must be 'core' or 'diagnostic'.")
            if suite["status"] not in {"planned", "implemented"}:
                raise ValueError("Field 'status' must be 'planned' or 'implemented'.")
            if not isinstance(suite["required"], bool):
                raise ValueError("Field 'required' must be true or false.")
            validate_support_level_value(suite["support_level"])
            suite_path = REPO_ROOT / suite["path"]
            if not suite_path.is_dir():
                raise ValueError(f"Referenced suite directory does not exist: {suite['path']}")
        except ValueError as exc:
            errors.append(f"{suite_id}: {exc}")
    return errors



def _validate_jsonl_cases(path, case_validator):
    """Validate JSONL cases with a supplied case validator."""

    errors = []
    if not path.exists():
        return errors

    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                case = json.loads(stripped)
            except json.JSONDecodeError as exc:
                errors.append(f"{path.relative_to(REPO_ROOT)} line {line_number}: invalid JSON: {exc}")
                continue
            try:
                case_validator(case)
            except ValueError as exc:
                case_id = case.get("id", "<unknown>") if isinstance(case, dict) else "<unknown>"
                errors.append(f"{path.relative_to(REPO_ROOT)} line {line_number} ({case_id}): {exc}")
    return errors


def validate_capability_cases(path=BENCHMARKS_DIR / "core" / "capability_validation" / "cases.jsonl"):
    """Validate capability-validation JSONL cases with generic case schema checks."""

    return _validate_jsonl_cases(path, validate_case_base)


def _validate_observation_normalization_case(case):
    validate_case_base(case)
    if case.get("endpoint") != "/check":
        raise ValueError("Field 'endpoint' must be '/check'.")
    if not isinstance(case.get("expected"), dict):
        raise ValueError("Field 'expected' must be a dictionary.")
    if not case["expected"].get("validator"):
        raise ValueError("Field 'expected.validator' is required.")
    if not isinstance(case.get("thought_chain"), list):
        raise ValueError("Field 'thought_chain' must exist and be a list.")
    if not isinstance(case.get("paper_tags"), list) or not case["paper_tags"]:
        raise ValueError("Field 'paper_tags' must exist and be a non-empty list.")
    if not isinstance(case.get("risk_category"), str) or not case["risk_category"]:
        raise ValueError("Field 'risk_category' must exist and be a string.")
    if not isinstance(case.get("expected_signal_family"), str) or not case["expected_signal_family"]:
        raise ValueError("Field 'expected_signal_family' must exist and be a string.")


def validate_observation_normalization_cases(
    path=BENCHMARKS_DIR / "core" / "observation_normalization" / "cases.jsonl",
):
    """Validate observation-normalization JSONL cases with generic and suite-specific checks."""

    return _validate_jsonl_cases(path, _validate_observation_normalization_case)


def _validate_decision_compatibility_case(case):
    validate_case_base(case)
    if case.get("endpoint") != "/check":
        raise ValueError("Field 'endpoint' must be '/check'.")
    if not isinstance(case.get("expected"), dict):
        raise ValueError("Field 'expected' must be a dictionary.")
    if not case["expected"].get("validator"):
        raise ValueError("Field 'expected.validator' is required.")
    if not isinstance(case.get("thought_chain"), list):
        raise ValueError("Field 'thought_chain' must exist and be a list.")
    if not isinstance(case.get("paper_tags"), list) or not case["paper_tags"]:
        raise ValueError("Field 'paper_tags' must exist and be a non-empty list.")
    if not isinstance(case.get("risk_category"), str) or not case["risk_category"]:
        raise ValueError("Field 'risk_category' must exist and be a string.")
    expected_decision = case.get("expected_decision")
    if expected_decision not in DECISION_VOCABULARY:
        raise ValueError("Field 'expected_decision' must exist and be in the decision vocabulary.")
    acceptable = case.get("acceptable_decisions")
    if not isinstance(acceptable, list) or not acceptable:
        raise ValueError("Field 'acceptable_decisions' must exist and be a non-empty list.")
    for decision in acceptable:
        if decision not in DECISION_VOCABULARY:
            raise ValueError(f"Acceptable decision is not in the decision vocabulary: {decision}")
    if expected_decision not in acceptable:
        raise ValueError("Field 'expected_decision' must be included in acceptable_decisions.")


def validate_decision_compatibility_cases(
    path=BENCHMARKS_DIR / "core" / "decision_compatibility" / "cases.jsonl",
):
    """Validate decision-compatibility JSONL cases with generic and suite-specific checks."""

    return _validate_jsonl_cases(path, _validate_decision_compatibility_case)


def _validate_runtime_trajectory_case(case):
    required = (
        "id", "support_level", "decision_support_level", "controller_support_level", "risk_category",
        "paper_tags", "user_goal", "environment_state", "latest_human_message", "thought_chain",
        "agent_proposal", "proposed_agent_response", "expected_mapped_decision",
        "acceptable_mapped_decisions", "expected_controller_action", "acceptable_controller_actions",
        "expected_trajectory_outcome", "unsafe_response_expected_prevented", "safe_completion_expected",
    )
    require_fields(case, required)
    if case.get("support_level") != "simulated":
        raise ValueError("Field 'support_level' must be 'simulated'.")
    if case.get("decision_support_level") != "compatibility_mapped":
        raise ValueError("Field 'decision_support_level' must be 'compatibility_mapped'.")
    if case.get("controller_support_level") != "simulated":
        raise ValueError("Field 'controller_support_level' must be 'simulated'.")
    if case.get("mode", "performance") not in {"performance", "insight"}:
        raise ValueError("Field 'mode' must be 'performance' or 'insight' when provided.")
    if not isinstance(case.get("thought_chain"), list) or not case["thought_chain"]:
        raise ValueError("Field 'thought_chain' must exist and be a non-empty list.")
    for entry in case["thought_chain"]:
        if not isinstance(entry, dict) or entry.get("role") not in {"human", "agent"} or not isinstance(entry.get("content"), str):
            raise ValueError("Each thought_chain entry must have role human/agent and string content.")
    if not isinstance(case.get("paper_tags"), list) or not case["paper_tags"]:
        raise ValueError("Field 'paper_tags' must exist and be a non-empty list.")
    expected_decision = case.get("expected_mapped_decision")
    if expected_decision not in DECISION_VOCABULARY:
        raise ValueError("Field 'expected_mapped_decision' must exist and be in the decision vocabulary.")
    acceptable_decisions = case.get("acceptable_mapped_decisions")
    if not isinstance(acceptable_decisions, list) or not acceptable_decisions:
        raise ValueError("Field 'acceptable_mapped_decisions' must exist and be a non-empty list.")
    for decision in acceptable_decisions:
        if decision not in DECISION_VOCABULARY:
            raise ValueError(f"Acceptable mapped decision is not in the decision vocabulary: {decision}")
    if expected_decision not in acceptable_decisions:
        raise ValueError("Field 'expected_mapped_decision' must be included in acceptable_mapped_decisions.")
    expected_action = case.get("expected_controller_action")
    if expected_action not in CONTROLLER_ACTIONS:
        raise ValueError("Field 'expected_controller_action' must exist and be a valid controller action.")
    acceptable_actions = case.get("acceptable_controller_actions")
    if not isinstance(acceptable_actions, list) or not acceptable_actions:
        raise ValueError("Field 'acceptable_controller_actions' must exist and be a non-empty list.")
    for action in acceptable_actions:
        if action not in CONTROLLER_ACTIONS:
            raise ValueError(f"Acceptable controller action is not valid: {action}")
    if expected_action not in acceptable_actions:
        raise ValueError("Field 'expected_controller_action' must be included in acceptable_controller_actions.")
    if expected_action == "apply_safe_revision" and not case.get("safe_revision"):
        raise ValueError("Field 'safe_revision' is required for apply_safe_revision cases.")
    if expected_action == "request_clarification" and not case.get("clarification_prompt"):
        raise ValueError("Field 'clarification_prompt' is required for request_clarification cases.")
    if expected_action in {"route_to_review", "pause_for_review"} and not case.get("review_reason"):
        raise ValueError("Field 'review_reason' is required for review-routing cases.")


def validate_runtime_trajectory_cases(
    path=BENCHMARKS_DIR / "core" / "runtime_trajectories" / "cases.jsonl",
):
    """Validate runtime-trajectory JSONL cases with lightweight suite-specific checks."""

    return _validate_jsonl_cases(path, _validate_runtime_trajectory_case)

def main():
    try:
        manifest = load_suite_manifest()
        errors = validate_manifest(manifest)
        errors.extend(validate_capability_cases())
        errors.extend(validate_observation_normalization_cases())
        errors.extend(validate_decision_compatibility_cases())
        errors.extend(validate_runtime_trajectory_cases())
    except ValueError as exc:
        errors = [str(exc)]
        manifest = {"suites": []}

    if errors:
        print("Benchmark suite manifest validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    suites = manifest["suites"]
    core_count = sum(1 for suite in suites if suite["category"] == "core")
    diagnostic_count = sum(1 for suite in suites if suite["category"] == "diagnostic")
    print(
        "Benchmark suite manifest validation passed: "
        f"{len(suites)} suites ({core_count} core, {diagnostic_count} diagnostic)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
