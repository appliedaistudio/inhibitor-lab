"""Support level definitions for benchmark suite metadata."""

from enum import Enum


class SupportLevel(str, Enum):
    """Known benchmark support levels."""

    NATIVE = "native"
    COMPATIBILITY_MAPPED = "compatibility_mapped"
    SIMULATED = "simulated"


SUPPORT_LEVELS = tuple(level.value for level in SupportLevel)


def is_valid_support_level(value):
    """Return True when *value* is a known support-level string."""

    return isinstance(value, str) and value in SUPPORT_LEVELS


def validate_support_level(value):
    """Return *value* when valid, otherwise raise ValueError."""

    if is_valid_support_level(value):
        return value
    raise ValueError(f"Unknown support level: {value!r}")
