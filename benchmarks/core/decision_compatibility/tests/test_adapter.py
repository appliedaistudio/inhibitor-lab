import unittest

from benchmarks.core.decision_compatibility.adapter import DECISION_VOCABULARY, map_decision


def response(observations=None, outcomes=None, norms=None, regulations=None):
    def records(items):
        return [{"name": name, "value": value} for name, value in (items or [])]

    return {
        "ok": True,
        "data": {"result": {"llm_inhibition": {
            "observations": records(observations),
            "predictions": {
                "outcomes": records(outcomes),
                "norms": records(norms),
                "regulations": records(regulations),
            },
        }}},
    }


class AdapterPredictionEvidenceTests(unittest.TestCase):
    def map(self, **kwargs):
        return map_decision({}, response(**kwargs))

    def test_structured_groups_are_separate_and_combined(self):
        mapped = self.map(
            observations=[("ai_executes_unsafe_instruction", True)],
            outcomes=[("system_exploitation_risk", True)],
            norms=[("system_integrity_violated", True)],
            regulations=[("audit_log_missing", True)],
        )
        self.assertEqual(mapped["matched_observation_names"], ["ai_executes_unsafe_instruction"])
        self.assertEqual(mapped["matched_outcome_prediction_names"], ["system_exploitation_risk"])
        self.assertEqual(mapped["matched_norm_prediction_names"], ["system_integrity_violated"])
        self.assertEqual(mapped["matched_regulation_prediction_names"], ["audit_log_missing"])
        self.assertEqual(len(mapped["matched_signal_names"]), 4)

    def test_severe_predictions_are_not_warning_or_allow(self):
        for label in ("system_exploitation_risk", "unsafe_autonomous_decision"):
            with self.subTest(label=label):
                self.assertIn(self.map(outcomes=[(label, True)])["mapped_decision"], {"revise", "pause", "escalate", "block"})

    def test_direct_unsafe_ai_behavior_blocks(self):
        for label in ("ai_executes_unsafe_instruction", "ai_complies_with_unsafe_request"):
            with self.subTest(label=label):
                self.assertEqual(self.map(observations=[(label, True)])["mapped_decision"], "block")

    def test_safe_refusal_deescalates_harmful_intent(self):
        mapped = self.map(observations=[("user_requests_harmful_action", True), ("ai_refuses_harmful_request", True)])
        self.assertIn(mapped["mapped_decision"], {"allow", "warn"})

    def test_context_sensitive_data_use_does_not_block(self):
        for label in ("ai_processes_confidential_data", "financial_information_used", "clinical_information_used", "insurance_claims_information_used", "consumer_information_used"):
            with self.subTest(label=label):
                self.assertNotEqual(self.map(observations=[(label, True)])["mapped_decision"], "block")

    def test_disclosure_is_restrictive(self):
        for label in ("ai_shares_user_data_without_consent", "system_exposes_sensitive_information"):
            with self.subTest(label=label):
                self.assertIn(self.map(observations=[(label, True)])["mapped_decision"], {"revise", "block"})

    def test_unknown_nested_label_does_not_crash(self):
        raw = response()
        raw["data"]["result"]["wrapper"] = [{"name": "future_unknown_signal", "value": True}]
        mapped = map_decision({}, raw)
        self.assertIn(mapped["mapped_decision"], DECISION_VOCABULARY)

    def test_false_and_missing_records_are_inactive(self):
        mapped = self.map(observations=[("ai_executes_unsafe_instruction", False), ("ai_refuses_harmful_request", "missing")])
        self.assertNotEqual(mapped["mapped_decision"], "block")
        self.assertEqual(mapped["matched_observation_names"], [])
        self.assertFalse(mapped["signal_flags"]["has_refusal_signal"])


if __name__ == "__main__":
    unittest.main()
