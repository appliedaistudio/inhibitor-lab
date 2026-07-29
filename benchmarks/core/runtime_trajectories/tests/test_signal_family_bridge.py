"""Synthetic coverage for runtime trajectory exact-label evidence scoring."""

import inspect
import unittest

from benchmarks.core.runtime_trajectories import signal_family_bridge
from benchmarks.core.runtime_trajectories.runner import enrich_mapping


def synthetic_case(category, expected=True):
    return {
        "benchmark_risk_category": category,
        "expected_signal_family": "none" if not expected else "synthetic",
        "expected_signal_present": expected,
    }


def synthetic_mapping(labels=(), **overrides):
    mapping = {
        "mapped_decision": "block",
        "matched_observation_names": list(labels),
        "matched_outcome_prediction_names": [],
        "matched_norm_prediction_names": [],
        "matched_regulation_prediction_names": [],
        "matched_prediction_names": [],
        "matched_signal_names": list(labels),
        "matched_keywords": [],
        "signal_flags": {"used_fixture_risk_fallback": False},
    }
    mapping.update(overrides)
    return mapping


class SignalFamilyBridgeTests(unittest.TestCase):
    def test_privacy_exact_labels_satisfy_privacy_evidence(self):
        result = enrich_mapping(
            synthetic_case("privacy_leakage"),
            synthetic_mapping(("ai_processes_confidential_data", "gdpr_violation")),
        )
        self.assertEqual(result["relevant_signal_evidence"], [{
            "family": "privacy",
            "signal_names": ["ai_processes_confidential_data", "gdpr_violation"],
            "keywords": [],
        }])
        self.assertTrue(result["signal_expectation_met"])

    def test_unsafe_compliance_and_harm_prediction_support_harm_and_integrity(self):
        result = enrich_mapping(
            synthetic_case("prompt_injection"),
            synthetic_mapping(("ai_complies_with_unsafe_request", "harm")),
        )
        by_family = {item["family"]: item["signal_names"] for item in result["relevant_signal_evidence"]}
        self.assertEqual(by_family["harm"], ["ai_complies_with_unsafe_request", "harm"])
        self.assertEqual(by_family["integrity"], ["ai_complies_with_unsafe_request"])

    def test_integrity_predictions_support_integrity(self):
        for label in ("system_integrity_violated", "invalid_output"):
            with self.subTest(label=label):
                result = enrich_mapping(synthetic_case("unsafe_code"), synthetic_mapping((label,)))
                self.assertEqual(result["relevant_signal_evidence"][0]["family"], "integrity")
                self.assertEqual(result["relevant_signal_evidence"][0]["signal_names"], [label])

    def test_autonomy_predictions_support_audit_or_review(self):
        for label in ("unsafe_autonomous_decision", "control_or_autonomy_violated", "accountability_obscured"):
            with self.subTest(label=label):
                result = enrich_mapping(synthetic_case("excessive_agency"), synthetic_mapping((label,)))
                evidence = {item["family"]: item for item in result["relevant_signal_evidence"]}
                self.assertEqual(evidence["audit_or_review"]["signal_names"], [label])

    def test_benign_control_without_evidence_meets_absence_expectation(self):
        result = enrich_mapping(synthetic_case("benign_control", expected=False), synthetic_mapping())
        self.assertEqual(result["relevant_signal_evidence"], [])
        self.assertTrue(result["signal_expectation_met"])

    def test_fixture_fallback_never_counts_as_native_evidence(self):
        mapping = synthetic_mapping(
            matched_keywords=["unsafe"],
            signal_flags={"used_fixture_risk_fallback": True, "has_harm_signal": True},
        )
        result = enrich_mapping(synthetic_case("unsafe_code"), mapping)
        self.assertEqual(result["relevant_signal_evidence"], [])
        self.assertFalse(result["signal_expectation_met"])

    def test_acceptable_decision_alone_does_not_satisfy_signal_expectation(self):
        result = enrich_mapping(synthetic_case("unsafe_code"), synthetic_mapping(mapped_decision="block"))
        self.assertEqual(result["relevant_signal_evidence"], [])
        self.assertFalse(result["signal_expectation_met"])

    def test_bridge_is_case_id_free(self):
        self.assertNotIn("case_id", inspect.getsource(signal_family_bridge))


if __name__ == "__main__":
    unittest.main()
