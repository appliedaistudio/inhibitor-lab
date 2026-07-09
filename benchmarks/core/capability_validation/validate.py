"""Structural validators for the capability-validation benchmark suite."""


def validate_check_success(response):
    errors = []
    if not response.get("ok"):
        errors.append("Expected a successful HTTP response.")
    data = response.get("data")
    if not isinstance(data, dict):
        errors.append("Expected response data to be a dictionary.")
        return False, errors, {}

    result = data.get("result") if isinstance(data.get("result"), dict) else data
    for field in ("llm_inhibition", "rules_inhibition"):
        if field not in result:
            errors.append(f"Expected normalized result field '{field}'.")
    return not errors, errors, {"result": result}


def validate_catalog_success(response):
    errors = []
    if not response.get("ok"):
        errors.append("Expected a successful HTTP response.")
    data = response.get("data")
    if not isinstance(data, dict):
        errors.append("Expected catalog response data to be a dictionary.")
        return False, errors, {}

    catalog_keys = {"observations", "predictions", "version", "metadata", "catalog", "modes", "rules"}
    if not catalog_keys.intersection(data):
        errors.append("Expected catalog-like content or metadata.")
    return not errors, errors, {"catalog_keys": sorted(data.keys())}


def validate_invalid_mode_rejection(response):
    return _validate_rejection(response)


def validate_missing_thought_chain_rejection(response):
    return _validate_rejection(response)


def validate_response(case, response):
    validator_name = case.get("expected", {}).get("validator")
    validators = {
        "check_success": validate_check_success,
        "catalog_success": validate_catalog_success,
        "invalid_mode_rejection": validate_invalid_mode_rejection,
        "missing_thought_chain_rejection": validate_missing_thought_chain_rejection,
    }
    validator = validators.get(validator_name)
    if validator is None:
        return False, [f"Unknown validator: {validator_name}"], {}
    return validator(response)


def _validate_rejection(response):
    status = response.get("status")
    rejected = not response.get("ok") or status in {400, 422}
    errors = []
    if not rejected:
        errors.append("Expected request rejection or HTTP 400/422 status.")
    if "data" in response and response["data"] is not None and not isinstance(response["data"], (dict, list, str)):
        errors.append("Expected error body, when present, to be JSON-compatible.")
    return not errors, errors, {"status": status, "error": response.get("error")}
