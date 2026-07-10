"""Validation helpers for observation-normalization benchmark responses."""

OBSERVATION_KEYS = {
    "observations",
    "retained_observations",
    "suppressed_observations",
    "normalized_observations",
}
NORMALIZATION_KEYS = {
    "observation_normalization",
    "normalization",
    "normalized_observations",
    "retained_observations",
    "suppressed_observations",
}
PREDICTION_KEYS = {"predictions", "prediction", "inferences", "inference"}
DIAGNOSTIC_KEYS = {"diagnostics", "diagnostic", "evidence", "trace", "temporal_diagnostics"}
SIGNAL_CONTAINER_KEYS = OBSERVATION_KEYS | NORMALIZATION_KEYS | PREDICTION_KEYS | DIAGNOSTIC_KEYS


def extract_result(data):
    """Return the native result object from an API response data payload."""

    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        return data["result"]
    if isinstance(data, dict):
        return data
    return {}


def _contains_key(obj, keys):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in keys:
                return True
            if _contains_key(value, keys):
                return True
    elif isinstance(obj, list):
        return any(_contains_key(item, keys) for item in obj)
    return False


def _collect_text_parts(obj, parts):
    if isinstance(obj, dict):
        for key, value in obj.items():
            parts.append(str(key))
            _collect_text_parts(value, parts)
    elif isinstance(obj, list):
        for item in obj:
            _collect_text_parts(item, parts)
    elif obj is not None:
        parts.append(str(obj))


def collect_signal_text(result):
    """Collect searchable text from nested native signal fields."""

    parts = []
    _collect_text_parts(result, parts)
    return "\n".join(parts).lower()


def has_any_keyword(text, keywords):
    """Return all configured keywords found in text, case-insensitively."""

    lowered = (text or "").lower()
    return [keyword for keyword in keywords if str(keyword).lower() in lowered]


def _available_top_level_keys(data, result):
    keys = set()
    if isinstance(data, dict):
        keys.update(data.keys())
    if isinstance(result, dict):
        keys.update(result.keys())
    return sorted(str(key) for key in keys)


def validate_response(case, response):
    """Dispatch to the configured suite-specific validator."""

    expected = case.get("expected", {})
    validator = expected.get("validator")
    if validator != "normalization_signal":
        normalized = _base_normalized(case, response, {})
        return False, [f"Unsupported validator: {validator}"], normalized
    return validate_normalization_signal(case, response)


def _base_normalized(case, response, result):
    data = response.get("data") if isinstance(response, dict) else None
    return {
        "case_id": case.get("id"),
        "paper_tags": case.get("paper_tags", []),
        "risk_category": case.get("risk_category"),
        "expected_signal_family": case.get("expected_signal_family"),
        "has_llm_inhibition": isinstance(result, dict) and "llm_inhibition" in result,
        "has_rules_inhibition": isinstance(result, dict) and "rules_inhibition" in result,
        "has_observations": _contains_key(result, OBSERVATION_KEYS),
        "has_observation_normalization": _contains_key(result, NORMALIZATION_KEYS),
        "has_predictions": _contains_key(result, PREDICTION_KEYS),
        "has_diagnostics": _contains_key(result, DIAGNOSTIC_KEYS),
        "matched_keywords": [],
        "latency_ms": response.get("latency_ms") if isinstance(response, dict) else None,
        "available_top_level_keys": _available_top_level_keys(data, result),
    }


def validate_normalization_signal(case, response):
    """Validate structural and lightweight behavioral native observation signals."""

    errors = []
    if not isinstance(response, dict):
        response = {}
        errors.append("Response must be a dictionary.")

    if not response.get("ok"):
        errors.append(f"Response was not ok (status={response.get('status')}, error={response.get('error')}).")

    data = response.get("data")
    result = extract_result(data)
    normalized = _base_normalized(case, response, result)

    expected = case.get("expected", {})
    for field in expected.get("required_result_fields", []):
        if not isinstance(result, dict) or field not in result:
            errors.append(f"Missing required result field: {field}")

    has_signal_container = any(
        normalized[key]
        for key in (
            "has_observations",
            "has_observation_normalization",
            "has_predictions",
            "has_diagnostics",
        )
    )
    if expected.get("require_observation_or_prediction_signal") and not has_signal_container:
        errors.append("No observation, normalization, prediction, or diagnostic signal container was found.")

    signal_text = collect_signal_text(result)
    matched_keywords = has_any_keyword(signal_text, expected.get("signal_keywords", []))
    normalized["matched_keywords"] = matched_keywords
    if expected.get("require_observation_or_prediction_signal") and expected.get("signal_keywords") and not matched_keywords:
        errors.append("No configured signal keyword was found in exposed native result text.")

    return len(errors) == 0, errors, normalized
