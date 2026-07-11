#!/usr/bin/env python3
"""Executable runner for the decision-compatibility benchmark suite."""

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
from benchmarks.lib.schema import validate_case_base
from benchmarks.core.decision_compatibility.adapter import DECISION_VOCABULARY
from benchmarks.core.decision_compatibility.validate import validate_response

SUITE_ID = "decision_compatibility"
CASES_PATH = Path(__file__).resolve().parent / "cases.jsonl"


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
    validate_case_base(case)
    if case.get("support_level") != "compatibility_mapped":
        raise ValueError(f"Case {case.get('id')} must use compatibility_mapped support level.")
    if case.get("endpoint") != "/check":
        raise ValueError(f"Case {case.get('id')} must target /check.")
    if not isinstance(case.get("thought_chain"), list):
        raise ValueError(f"Case {case.get('id')} must define thought_chain as a list.")
    if case.get("mode") not in {"performance", "insight"}:
        raise ValueError(f"Case {case.get('id')} must use performance or insight mode.")
    if not isinstance(case.get("expected"), dict) or not case["expected"].get("validator"):
        raise ValueError(f"Case {case.get('id')} must define expected.validator.")
    for field in ("paper_tags", "risk_category", "expected_decision", "acceptable_decisions"):
        if field not in case:
            raise ValueError(f"Case {case.get('id')} must define {field}.")
    if not isinstance(case["paper_tags"], list) or not case["paper_tags"]:
        raise ValueError(f"Case {case.get('id')} must define non-empty paper_tags.")
    if not isinstance(case["risk_category"], str) or not case["risk_category"]:
        raise ValueError(f"Case {case.get('id')} must define risk_category as a string.")
    if case["expected_decision"] not in DECISION_VOCABULARY:
        raise ValueError(f"Case {case.get('id')} has invalid expected_decision.")
    if not isinstance(case["acceptable_decisions"], list) or not case["acceptable_decisions"]:
        raise ValueError(f"Case {case.get('id')} must define non-empty acceptable_decisions.")
    for decision in case["acceptable_decisions"]:
        if decision not in DECISION_VOCABULARY:
            raise ValueError(f"Case {case.get('id')} has invalid acceptable decision: {decision}.")
    if case["expected_decision"] not in case["acceptable_decisions"]:
        raise ValueError(f"Case {case.get('id')} must include expected_decision in acceptable_decisions.")
    return case


def execute_case(client, case):
    return client.check(case["thought_chain"], mode=case.get("mode", "performance"), options=case.get("options"))


def run_live(args, cases, endpoint):
    manifest = build_run_manifest(
        suite_id=SUITE_ID,
        run_id=args.run_id or None,
        runner_version="phase_5",
        endpoint=endpoint,
        total_cases=len(cases),
        notes="Validates deterministic compatibility mapping from current Inhibitor signals to paper-compatible runtime decision categories using a curated catalog-derived signal map.",
    )
    run_dir = create_run_dir(SUITE_ID, manifest["run_id"])
    write_json(run_dir / "manifest.json", manifest)

    client = InhibitorApiClient(endpoint, api_key=os.environ.get("INHIBITOR_API_KEY"), timeout=args.timeout)
    results = []
    for case in cases:
        response = execute_case(client, case)
        passed, errors, normalized = validate_response(case, response)
        raw_record = {"case_id": case["id"], "response": response}
        normalized_record = {"case_id": case["id"], "passed": passed, "errors": errors, "normalized": normalized}
        append_jsonl(run_dir / "raw_responses.jsonl", raw_record)
        append_jsonl(run_dir / "normalized_results.jsonl", normalized_record)
        results.append(normalized_record)

    passed_count = sum(1 for result in results if result["passed"])
    failed_count = len(results) - passed_count
    write_summary(run_dir / "summary.md", build_summary(manifest, results))
    print(f"Decision compatibility: {passed_count} passed, {failed_count} failed. Results: {run_dir}")
    return 0 if failed_count == 0 else 1


def build_summary(manifest, results):
    lines = [
        "# Decision Compatibility Summary", "", f"- Run ID: `{manifest['run_id']}`", f"- Suite: `{SUITE_ID}`",
        f"- Total cases: {len(results)}", f"- Passed: {sum(1 for result in results if result['passed'])}",
        f"- Failed: {sum(1 for result in results if not result['passed'])}", "",
        "This suite performs compatibility mapping for benchmark reporting, not native runtime enforcement.",
        "The mapping is based on `catalog_signal_map.md`, a curated and versioned catalog-derived signal map.", "", "## Cases",
    ]
    for result in results:
        normalized = result.get("normalized", {})
        status = "PASS" if result["passed"] else "FAIL"
        lines.append(f"- {status}: `{result['case_id']}`")
        lines.append(f"  - Risk category: `{normalized.get('risk_category')}`")
        lines.append(f"  - Expected decision: `{normalized.get('expected_decision')}`")
        lines.append(f"  - Mapped decision: `{normalized.get('mapped_decision')}`")
        lines.append(f"  - Acceptable decisions: {', '.join(normalized.get('acceptable_decisions', []))}")
        lines.append(f"  - Mapping reason: {normalized.get('mapping_reason')}")
        lines.append(f"  - Matched signal names: {', '.join(normalized.get('matched_signal_names', [])) or 'none'}")
        lines.append(f"  - Matched keywords: {', '.join(normalized.get('matched_keywords', [])) or 'none'}")
        true_flags = [key for key, value in normalized.get("signal_flags", {}).items() if value is True]
        lines.append(f"  - True signal flags: {', '.join(true_flags) or 'none'}")
        for error in result["errors"]:
            lines.append(f"  - Error: {error}")
    lines.append("")
    return "\n".join(lines)


def dry_run(cases):
    print(f"Decision compatibility dry run: {len(cases)} valid cases planned.")
    for case in cases:
        print(
            f"- {case['id']} mode={case.get('mode', 'performance')} risk={case.get('risk_category')} "
            f"expected={case.get('expected_decision')} acceptable={','.join(case.get('acceptable_decisions', []))} "
            f"paper_tags={','.join(case.get('paper_tags', []))}"
        )
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run decision-compatibility mapped decision checks.")
    parser.add_argument("--dry-run", action="store_true", help="Validate cases and print planned execution only.")
    parser.add_argument("--endpoint", help="Inhibitor base URL, for example https://iaas.appliedai.studio.")
    parser.add_argument("--require-live", action="store_true", help="Fail if no live endpoint is configured.")
    parser.add_argument("--run-id", help="Set the result run id.")
    parser.add_argument("--timeout", type=float, default=30.0, help="API call timeout in seconds.")
    args = parser.parse_args(argv)

    cases = load_cases()
    if args.dry_run:
        return dry_run(cases)

    endpoint = args.endpoint or os.environ.get("INHIBITOR_API_URL") or os.environ.get("INHIBITOR_BASE_URL")
    if not endpoint:
        print("Skipping live decision compatibility: no base URL was provided via --endpoint, INHIBITOR_API_URL, or INHIBITOR_BASE_URL.")
        return 1 if args.require_live else 0
    return run_live(args, cases, endpoint)


if __name__ == "__main__":
    sys.exit(main())
