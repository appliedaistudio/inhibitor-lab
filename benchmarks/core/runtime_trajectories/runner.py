#!/usr/bin/env python3
"""Run structured runtime trajectories against /check and deterministic mock tools."""
import argparse
import json
import os
from pathlib import Path
import sys

BENCHMARKS_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BENCHMARKS_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from benchmarks.core.decision_compatibility.adapter import map_decision
from benchmarks.core.runtime_trajectories.action_envelope import acceptable_signal_families
from benchmarks.core.runtime_trajectories.controller import apply_controller
from benchmarks.core.runtime_trajectories.thought_chain_renderer import render_thought_chain
from benchmarks.core.runtime_trajectories.validate import validate_case, validate_trajectory_result
from benchmarks.lib.api_client import InhibitorApiClient
from benchmarks.lib.manifest import build_run_manifest
from benchmarks.lib.result_writer import append_jsonl, create_run_dir, write_json, write_summary

CASES_PATH = Path(__file__).resolve().parent / "cases.jsonl"


def load_cases(path=CASES_PATH):
    cases = []
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if line.strip():
            try:
                case = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path} line {number}: {exc}") from exc
            validate_case(case)
            cases.append(case)
    return cases


def _mapping_case(case, rendered):
    risk_category = "benign_request" if case["benchmark_risk_category"] == "benign_control" else case["benchmark_risk_category"]
    return {"id": case["id"], "risk_category": risk_category,
            "thought_chain": rendered["thought_chain"], "acceptable_decisions": case["acceptable_decisions"]}


def enrich_mapping(case, mapping):
    expected_family = case["expected_signal_family"]
    flags = mapping.get("signal_flags", {})
    evidence = []
    # "none" denotes a control expectation, not a native catalog signal family.
    # Fixture-only decision fallbacks are likewise never recorded as native evidence.
    if expected_family != "none" and flags.get(f"has_{expected_family}_signal") and not flags.get("used_fixture_risk_fallback"):
        evidence.append({"family": expected_family, "signal_names": mapping.get("matched_signal_names", []),
                         "keywords": mapping.get("matched_keywords", [])})
    mapping["relevant_signal_evidence"] = evidence
    mapping["expected_signal_present"] = case["expected_signal_present"]
    mapping["signal_expectation_met"] = bool(evidence) == case["expected_signal_present"]
    return mapping


def run_live(args, cases, endpoint):
    manifest = build_run_manifest(suite_id="runtime_trajectories", run_id=args.run_id or None,
        runner_version="action_envelopes", endpoint=endpoint, total_cases=len(cases),
        notes="Structured action envelopes rendered into /check; simulated controller-enforced mock-tool outcomes.")
    run_dir = create_run_dir("runtime_trajectories", manifest["run_id"])
    write_json(run_dir / "manifest.json", manifest)
    client = InhibitorApiClient(endpoint, api_key=os.environ.get("INHIBITOR_API_KEY"), timeout=args.timeout)
    results = []
    for case in cases:
        rendered = render_thought_chain(case)
        response = client.check(rendered["thought_chain"], mode=rendered["mode"])
        mapping = enrich_mapping(case, map_decision(_mapping_case(case, rendered), response))
        result = apply_controller(case, mapping, response, rendered)
        passed, errors = validate_trajectory_result(case, result)
        append_jsonl(run_dir / "raw_responses.jsonl", {"case_id": case["id"], "response": response})
        append_jsonl(run_dir / "normalized_results.jsonl", {"case_id": case["id"], "mapping": mapping, "passed": passed, "errors": errors})
        append_jsonl(run_dir / "trajectory_results.jsonl", result)
        results.append((case["id"], passed, errors))
    write_json(run_dir / "scores.json", {"total_cases": len(results), "passed_cases": sum(item[1] for item in results),
        "support_levels": {"signal_evidence": "native", "decision": "compatibility_mapped", "controller": "simulated"}})
    write_summary(run_dir / "summary.md", "# Runtime Trajectories\n\nController and mock-tool outcomes are simulated benchmark enforcement, not production tool execution.\n")
    return 0 if all(item[1] for item in results) else 1


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--endpoint")
    parser.add_argument("--require-live", action="store_true")
    parser.add_argument("--run-id")
    parser.add_argument("--timeout", type=float, default=30)
    args = parser.parse_args(argv)
    cases = load_cases()
    if args.dry_run:
        print(f"Runtime trajectories dry run: {len(cases)} valid action-envelope cases planned.")
        for case in cases:
            print(f"- {case['id']} risk={case['benchmark_risk_category']} families={','.join(acceptable_signal_families(case['benchmark_risk_category']))}")
        return 0
    endpoint = args.endpoint or os.environ.get("INHIBITOR_API_URL") or os.environ.get("INHIBITOR_BASE_URL")
    if not endpoint:
        print("Skipping live runtime trajectories: no base URL configured.")
        return 1 if args.require_live else 0
    return run_live(args, cases, endpoint)


if __name__ == "__main__":
    sys.exit(main())
