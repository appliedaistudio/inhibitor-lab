import unittest

from benchmarks.core.runtime_trajectories.runner import (_error_type, _latency_summary,
                                                          _rate, build_scores, build_summary)


class RunnerMetricsTests(unittest.TestCase):
    def test_rate_and_latency_helpers(self):
        rate = _rate(3, 3, "unavailable")
        self.assertEqual(rate["value"], 1.0)
        self.assertEqual(rate["confidence_interval"]["method"], "wilson")
        self.assertIsNone(_rate(0, 0, "unavailable")["value"])
        self.assertIn("reason", _rate(0, 0, "unavailable"))
        latency = _latency_summary([100, 200, 300, 400])
        self.assertEqual((latency["p50"], latency["p95"], latency["p99"]), (250.0, 385.0, 397.0))

    def test_error_classification_and_scores(self):
        self.assertEqual(_error_type({"ok": False, "error": "request timed out"}), "timeout")
        self.assertEqual(_error_type({"ok": False, "status": 503, "error": "HTTP Error 503"}), "non_2xx")
        self.assertEqual(_error_type({"ok": False, "error": "URLError: offline"}), "url_error")
        self.assertEqual(_error_type({"status": 200}), "malformed_response")
        cases = [
            {"id": "unsafe", "severity": "critical", "benchmark_risk_category": "privacy_leakage",
             "acceptable_decisions": ["block"], "expected_audit_fields": ["case_id", "mapped_decision", "mock_tool"]},
            {"id": "benign", "severity": "low", "benchmark_risk_category": "benign_control",
             "acceptable_decisions": ["allow"], "expected_audit_fields": ["case_id", "support_levels"]},
        ]
        def result(case_id, category, decision, executed, audit=True):
            data = {"case_id": case_id, "benchmark_risk_category": category, "mapped_decision": decision,
                    "signal_expectation_met": True, "controller_action": "block_original" if not executed else "execute_mock_tool",
                    "mock_tool": {"executed": executed}, "expected_vs_actual_controller_outcome": {"matches": True}}
            if not audit:
                data.pop("controller_action")
            return data
        trajectories = [result("unsafe", "privacy_leakage", "block", False), result("benign", "benign_control", "allow", True)]
        raw = [
            {"case_id": "unsafe", "response": {"ok": True, "status": 200, "latency_ms": 100}},
            {"case_id": "benign", "response": {"ok": False, "error": "Timed out", "latency_ms": 400}},
        ]
        scores = build_scores(cases, trajectories, raw, [("unsafe", True, []), ("benign", False, ["x"])])
        self.assertEqual(scores["operational_reliability"]["timeout_rate"]["numerator"], 1)
        self.assertEqual(scores["controller_outcome"]["harm_weighted_unsafe_execution_rate"]["denominator"], 5)
        self.assertEqual(scores["severity_breakdown"]["low"]["eligible_cases"], 0)
        self.assertEqual(scores["risk_category_breakdown"]["benign_control"]["safe_task_completion_rate"]["value"], None)
        summary = build_summary({"suite_id": "runtime_trajectories", "run_id": "test", "endpoint": "https://example.invalid"}, scores, trajectories)
        self.assertIn("Breakdown Highlights", summary)
        self.assertIn("Latency percentiles", summary)
        audit = scores["auditability"]["per_case_audit_completeness"]
        self.assertEqual(audit[1]["missing_fields"], ["support_levels"])


if __name__ == "__main__":
    unittest.main()
