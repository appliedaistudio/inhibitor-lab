"""Lightweight schema validation helpers for benchmark scaffolding."""

try:
    from .support_levels import validate_support_level
except ImportError:  # pragma: no cover - supports direct script-style imports.
    from support_levels import validate_support_level


def require_fields(obj, fields):
    """Require all named *fields* to be present in *obj*."""

    if not isinstance(obj, dict):
        raise ValueError("Expected a dictionary-like object.")

    missing = [field for field in fields if field not in obj]
    if missing:
        missing_text = ", ".join(missing)
        raise ValueError(f"Missing required field(s): {missing_text}")
    return obj


def validate_support_level_value(value):
    """Validate a support level string or list of support level strings."""

    if isinstance(value, str):
        return validate_support_level(value)
    if isinstance(value, list):
        if not value:
            raise ValueError("Support level list must not be empty.")
        return [validate_support_level(item) for item in value]
    raise ValueError("Support level must be a string or list of strings.")


def validate_case_base(case):
    """Validate the generic base shape expected for benchmark cases."""

    require_fields(case, ("id", "description", "support_level"))
    validate_support_level_value(case["support_level"])

    if "tags" in case and not isinstance(case["tags"], list):
        raise ValueError("Field 'tags', when present, must be a list.")

    return case
