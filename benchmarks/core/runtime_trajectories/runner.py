#!/usr/bin/env python3
"""Executable runner for the Phase 6 simulated runtime-trajectory benchmark suite."""

import argparse
import json
import os
from pathlib import Path
import sys

BENCHMARKS_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BENCHMARKS_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from benchmarks.lib.api_client import InhibitorApiClient
from benchmarks.lib.manifest import build_run_manifest
from benchmarks.lib.result_writer import append_jsonl, create_run_dir, write_json, write_summary
from benchmarks.core.decision_compatibility.adapter import DECISION_VOCABULARY, map_decision
from benchmarks.core.runtime_trajectories.controller import ACTION_BY_DECISION, apply_controller
from benchmarks.core.runtime_trajectories.validate import validate_trajectory_result

SUITE_ID = "runtime_trajectories"
CASES_PATH = Path(__file__).resolve().parent / "cases.jsonl"
CONTROLLER_ACTIONS = set(ACTION_BY_DECISION.values())


def load_cases(path=CASES_PATH):
    cases = []
    with Path(path).open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                case = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path} line {line_number}: invalid JSON: {exc}") from exc
            validate_case(case)
            cases.append(case)
    return cases


def validate_case(case):
    required = ["id", "support_level", "decision_support_level", "controller_support_level", "risk_category", "paper_tags", "user_goal", "environment_state", "latest_human_message", "thought_chain", "agent_proposal", "proposed_agent_response", "expected_mapped_decision", "acceptable_mapped_decisions", "expected_controller_action", "acceptable_controller_actions", "expected_trajectory_outcome", "unsafe_response_expected_prevented", "safe_completion_expected"]
    for field in required:
        if field not in case:
            raise ValueError(f"Case {case.get('id')} missing required field: {field}")
    if case["support_level"] != "simulated" or case["decision_support_level"] != "compatibility_mapped" or case["controller_support_level"] != "simulated":
        raise ValueError(f"Case {case.get('id')} has invalid support levels.")
    if not isinstance(case["thought_chain"], list) or not all(isinstance(item, dict) and item.get("role") in {"human", "agent"} for item in case["thought_chain"]):
        raise ValueError(f"Case {case.get('id')} thought_chain must contain human/agent entries.")
    if case.get("mode", "performance") not in {"performance", "insight"}:
        raise ValueError(f"Case {case.get('id')} mode must be performance or insight.")
    if case["expected_mapped_decision"] not in DECISION_VOCABULARY:
        raise ValueError(f"Case {case.get('id')} has invalid expected_mapped_decision.")
    if not isinstance(case["acceptable_mapped_decisions"], list) or case["expected_mapped_decision"] not in case["acceptable_mapped_decisions"]:
        raise ValueError(f"Case {case.get('id')} must include expected_mapped_decision in acceptable_mapped_decisions.")
    for decision in case["acceptable_mapped_decisions"]:
        if decision not in DECISION_VOCABULARY:
            raise ValueError(f"Case {case.get('id')} has invalid acceptable mapped decision: {decision}.")
    if case["expected_controller_action"] not in CONTROLLER_ACTIONS:
        raise ValueError(f"Case {case.get('id')} has invalid expected_controller_action.")
    if not isinstance(case["acceptable_controller_actions"], list) or case["expected_controller_action"] not in case["acceptable_controller_actions"]:
        raise ValueError(f"Case {case.get('id')} must include expected_controller_action in acceptable_controller_actions.")
    for action in case["acceptable_controller_actions"]:
        if action not in CONTROLLER_ACTIONS:
            raise ValueError(f"Case {case.get('id')} has invalid acceptable controller action: {action}.")
    if case["expected_controller_action"] == "apply_safe_revision" and not case.get("safe_revision"):
        raise ValueError(f"Case {case.get('id')} must define safe_revision.")
    if case["expected_controller_action"] == "request_clarification" and not case.get("clarification_prompt"):
        raise ValueError(f"Case {case.get('id')} must define clarification_prompt.")
    if case["expected_controller_action"] in {"route_to_review", "pause_for_review"} and not case.get("review_reason"):
        raise ValueError(f"Case {case.get('id')} must define review_reason.")
    return case


def _adapter_case(case):
    adapted = dict(case)
    adapted["expected_decision"] = case.get("expected_mapped_decision")
    adapted["acceptable_decisions"] = case.get("acceptable_mapped_decisions", [])
    return adapted


def execute_case(client, case):
    return client.check(case["thought_chain"], mode=case.get("mode", "performance"), options=case.get("options"))


def compute_scores(results):
    total = len(results)
    def rate(field):
        return round(sum(1 for item in results if item.get(field)) / total, 6) if total else 0.0
    return {
        "total_cases": total,
        "metadata": {
            "support_level": "simulated",
            "decision_support_level": "compatibility_mapped",
            "controller_support_level": "simulated",
            "interpretation_limit": "Proxy rates from a deterministic simulated controller; not production enforcement metrics.",
        },
        "unsafe_response_prevention_proxy_rate": rate("unsafe_response_prevented"),
        "safe_completion_preservation_proxy_rate": rate("safe_completion_preserved"),
        "adjustment_success_proxy_rate": rate("adjustment_success"),
        "audit_trace_completion_rate": rate("audit_trace_complete"),
    }


def run_live(args, cases, endpoint):
    manifest = build_run_manifest(
        suite_id=SUITE_ID,
        run_id=args.run_id or None,
        runner_version="phase_6",
        endpoint=endpoint,
        total_cases=len(cases),
        notes="Simulated runtime-trajectory proxy suite using Phase 5 compatibility-mapped decisions and fixture-provided proposed agent responses.",
    )
    run_dir = create_run_dir(SUITE_ID, manifest["run_id"])
    write_json(run_dir / "manifest.json", manifest)
    client = InhibitorApiClient(endpoint, api_key=os.environ.get("INHIBITOR_API_KEY"), timeout=args.timeout)
    trajectory_results = []
    normalized_records = []
    for case in cases:
        response = execute_case(client, case)
        mapping = map_decision(_adapter_case(case), response)
        result = apply_controller(case, mapping, {"status": response.get("status"), "ok": response.get("ok"), "latency_ms": response.get("latency_ms")})
        passed, errors = validate_trajectory_result(case, result)
        raw_record = {"case_id": case["id"], "response": response}
        normalized_record = {"case_id": case["id"], "passed": passed, "errors": errors, "normalized": mapping}
        append_jsonl(run_dir / "raw_responses.jsonl", raw_record)
        append_jsonl(run_dir / "normalized_results.jsonl", normalized_record)
        append_jsonl(run_dir / "trajectory_results.jsonl", result)
        normalized_records.append(normalized_record)
        trajectory_results.append(result)
    scores = compute_scores(trajectory_results)
    write_json(run_dir / "scores.json", scores)
    write_summary(run_dir / "summary.md", build_summary(manifest, normalized_records, trajectory_results, scores))
    failed_count = sum(1 for item in normalized_records if not item["passed"])
    print(f"Runtime trajectories: {len(cases) - failed_count} passed, {failed_count} failed. Results: {run_dir}")
    return 0 if failed_count == 0 else 1


def build_summary(manifest, normalized_records, trajectory_results, scores):
    lines = [
        "# Runtime Trajectories Summary", "", f"- Run ID: `{manifest['run_id']}`", f"- Suite: `{SUITE_ID}`",
        f"- Total cases: {len(trajectory_results)}", "- Support level: `simulated`", "- Decision support level: `compatibility_mapped`", "- Controller support level: `simulated`", "",
        "These are proxy rates from a deterministic simulated controller, not production enforcement metrics and not native runtime enforcement.", "", "## Scores",
    ]
    for key, value in scores.items():
        if key != "metadata":
            lines.append(f"- `{key}`: {value}")
    lines.extend(["", "## Cases"])
    by_case = {item["case_id"]: item for item in normalized_records}
    for result in trajectory_results:
        record = by_case[result["case_id"]]
        status = "PASS" if record["passed"] else "FAIL"
        lines.append(f"- {status}: `{result['case_id']}`")
        lines.append(f"  - Mapped decision: `{result['mapped_decision']}`")
        lines.append(f"  - Controller action: `{result['controller_action']}`")
        lines.append(f"  - Trajectory outcome: `{result['trajectory_outcome']}`")
        lines.append(f"  - Proxy fields: unsafe_response_prevented={result['unsafe_response_prevented']}, safe_completion_preserved={result['safe_completion_preserved']}, adjustment_success={result['adjustment_success']}, audit_trace_complete={result['audit_trace_complete']}")
        for error in record["errors"]:
            lines.append(f"  - Error: {error}")
    lines.append("")
    return "\n".join(lines)


def dry_run(cases):
    print(f"Runtime trajectories dry run: {len(cases)} valid cases planned.")
    for case in cases:
        print(f"- {case['id']} mode={case.get('mode', 'performance')} risk={case['risk_category']} expected_decision={case['expected_mapped_decision']} expected_action={case['expected_controller_action']} outcome={case['expected_trajectory_outcome']}")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run simulated runtime-trajectory benchmark checks.")
    parser.add_argument("--dry-run", action="store_true", help="Validate cases and print planned execution only.")
    parser.add_argument("--endpoint", help="Inhibitor base URL.")
    parser.add_argument("--require-live", action="store_true", help="Fail if no live endpoint is configured.")
    parser.add_argument("--run-id", help="Set the result run id.")
    parser.add_argument("--timeout", type=float, default=30.0, help="API call timeout in seconds.")
    args = parser.parse_args(argv)
    cases = load_cases()
    if args.dry_run:
        return dry_run(cases)
    endpoint = args.endpoint or os.environ.get("INHIBITOR_API_URL") or os.environ.get("INHIBITOR_BASE_URL")
    if not endpoint:
        print("Skipping live runtime trajectories: no base URL was provided via --endpoint, INHIBITOR_API_URL, or INHIBITOR_BASE_URL.")
        return 1 if args.require_live else 0
    return run_live(args, cases, endpoint)


if __name__ == "__main__":
    sys.exit(main())
