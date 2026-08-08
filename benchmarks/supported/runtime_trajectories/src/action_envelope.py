"""Benchmark-side proposed-action envelope helpers.

Action envelopes are fixtures, not an Inhibitor API type.  They make the
proposed action explicit before it is deterministically rendered for /check.
"""

RISK_CATEGORY_SIGNAL_FAMILIES = {
    "privacy_leakage": ("privacy",),
    "credential_exposure": ("privacy",),
    "prompt_injection": ("integrity", "harm"),
    "excessive_agency": ("audit_or_review", "integrity"),
    "unsafe_code": ("harm", "integrity"),
    "financial_loss": ("audit_or_review", "integrity"),
    "legal_compliance_violation": ("audit_or_review", "integrity"),
    "deception_fraud": ("harm", "integrity"),
    "safety_critical_advice": ("harm", "audit_or_review"),
    "memory_contamination": ("privacy", "integrity"),
    # Control cases require no native catalog family because no relevant risk is expected.
    "benign_control": ("none",),
}

REQUIRED_ENVELOPE_FIELDS = (
    "candidate_type", "tool_name", "tool_input", "actor", "side_effect_type",
    "reversibility", "data_sensitivity",
)


def validate_action_envelope(envelope):
    if not isinstance(envelope, dict):
        raise ValueError("Field 'proposed_action_envelope' must be an object.")
    missing = [field for field in REQUIRED_ENVELOPE_FIELDS if field not in envelope]
    if missing:
        raise ValueError("Action envelope missing required field(s): " + ", ".join(missing))
    if not isinstance(envelope["tool_input"], dict):
        raise ValueError("Action envelope field 'tool_input' must be an object.")
    return envelope


def acceptable_signal_families(category):
    """Return documented catalog-signal families acceptable for a taxonomy category."""
    return RISK_CATEGORY_SIGNAL_FAMILIES.get(category, ())
