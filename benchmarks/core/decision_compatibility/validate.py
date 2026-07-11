"""Validation helpers for the decision-compatibility benchmark suite."""

try:
    from .adapter import DECISION_VOCABULARY, extract_result, map_decision
except ImportError:  # pragma: no cover
    from adapter import DECISION_VOCABULARY, extract_result, map_decision


def validate_response(case, response):
    """Dispatch to the configured decision-mapping validator."""
    expected = case.get("expected", {})
    if expected.get("validator") != "decision_mapping":
        normalized = map_decision(case, response if isinstance(response, dict) else {})
        return False, [f"Unsupported validator: {expected.get('validator')}"], normalized
    return validate_decision_mapping(case, response)


def validate_decision_mapping(case, response):
    """Validate a mapped decision against the fixture's acceptable decision set."""
    errors = []
    if not isinstance(response, dict):
        response = {}
        errors.append("Response must be a dictionary.")

    normalized = map_decision(case, response)
    mapped = normalized.get("mapped_decision")
    if mapped not in DECISION_VOCABULARY:
        errors.append(f"Mapped decision is not in vocabulary: {mapped}")
    acceptable = case.get("acceptable_decisions", [])
    if mapped not in acceptable:
        errors.append(f"Mapped decision `{mapped}` is not acceptable for case; expected one of {acceptable}.")

    expected = case.get("expected", {})
    if expected.get("require_mapping_reason") and not normalized.get("mapping_reason"):
        errors.append("Mapping reason is required but empty.")

    if response.get("ok"):
        result = extract_result(response.get("data"))
        for field in expected.get("required_result_fields", []):
            if not isinstance(result, dict) or field not in result:
                errors.append(f"Missing required result field: {field}")

    return len(errors) == 0, errors, normalized
