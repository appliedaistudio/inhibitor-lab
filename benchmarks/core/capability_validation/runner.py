#!/usr/bin/env python3
"""Executable runner for the capability-validation benchmark suite."""

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
from benchmarks.core.capability_validation.validate import validate_response

SUITE_ID = "capability_validation"
CASES_PATH = Path(__file__).resolve().parent / "cases.jsonl"


def load_cases(path=CASES_PATH):
    cases = []
    with Path(path).open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            case = json.loads(stripped)
            validate_case(case)
            cases.append(case)
    return cases


def validate_case(case):
    validate_case_base(case)
    endpoint = case.get("endpoint")
    if endpoint not in {"/check", "/catalog"}:
        raise ValueError(f"Case {case.get('id')} has unsupported endpoint: {endpoint}")
    if not isinstance(case.get("expected"), dict) or not case["expected"].get("validator"):
        raise ValueError(f"Case {case.get('id')} must define expected.validator")
    return case


def execute_case(client, case):
    endpoint = case["endpoint"]
    if endpoint == "/catalog":
        return client.catalog()
    if "thought_chain" in case:
        return client.check(case["thought_chain"], mode=case.get("mode", "performance"), options=case.get("options"))
    return client._post_json("/check", {"mode": case.get("mode", "performance")})


def run_live(args, cases, endpoint):
    run_id = args.run_id or None
    manifest = build_run_manifest(
        suite_id=SUITE_ID,
        run_id=run_id,
        runner_version="phase_3",
        endpoint=endpoint,
        total_cases=len(cases),
        notes="Capability validation checks API compatibility and response shape only.",
    )
    run_id = manifest["run_id"]
    run_dir = create_run_dir(SUITE_ID, run_id)
    write_json(run_dir / "manifest.json", manifest)

    client = InhibitorApiClient(endpoint, api_key=os.environ.get("INHIBITOR_API_KEY"), timeout=args.timeout)
    results = []
    for case in cases:
        response = execute_case(client, case)
        passed, errors, normalized = validate_response(case, response)
        raw_record = {"case_id": case["id"], "response": response}
        normalized_record = {
            "case_id": case["id"],
            "passed": passed,
            "errors": errors,
            "normalized": normalized,
        }
        append_jsonl(run_dir / "raw_responses.jsonl", raw_record)
        append_jsonl(run_dir / "normalized_results.jsonl", normalized_record)
        results.append(normalized_record)

    passed_count = sum(1 for result in results if result["passed"])
    failed_count = len(results) - passed_count
    summary = build_summary(manifest, results)
    write_summary(run_dir / "summary.md", summary)
    print(f"Capability validation: {passed_count} passed, {failed_count} failed. Results: {run_dir}")
    return 0 if failed_count == 0 else 1


def build_summary(manifest, results):
    lines = [
        "# Capability Validation Summary",
        "",
        f"- Run ID: `{manifest['run_id']}`",
        f"- Suite: `{SUITE_ID}`",
        f"- Total cases: {len(results)}",
        f"- Passed: {sum(1 for result in results if result['passed'])}",
        f"- Failed: {sum(1 for result in results if not result['passed'])}",
        "",
        "This suite validates API compatibility and response shape only.",
        "",
        "## Cases",
    ]
    for result in results:
        status = "PASS" if result["passed"] else "FAIL"
        lines.append(f"- {status}: `{result['case_id']}`")
        for error in result["errors"]:
            lines.append(f"  - {error}")
    lines.append("")
    return "\n".join(lines)


def dry_run(cases):
    print(f"Capability validation dry run: {len(cases)} valid cases planned.")
    for case in cases:
        mode = case.get("mode", "performance") if case["endpoint"] == "/check" else "n/a"
        print(f"- {case['id']} endpoint={case['endpoint']} mode={mode}")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run capability-validation API compatibility checks.")
    parser.add_argument("--dry-run", action="store_true", help="Validate cases and print planned execution only.")
    parser.add_argument(
        "--endpoint",
        help="Inhibitor base URL, for example https://iaas.appliedai.studio. Overrides environment variables.",
    )
    parser.add_argument("--require-live", action="store_true", help="Fail if no live endpoint is configured.")
    parser.add_argument("--run-id", help="Set the result run id.")
    parser.add_argument("--timeout", type=float, default=30.0, help="API call timeout in seconds.")
    args = parser.parse_args(argv)

    cases = load_cases()
    if args.dry_run:
        return dry_run(cases)

    endpoint = args.endpoint or os.environ.get("INHIBITOR_API_URL") or os.environ.get("INHIBITOR_BASE_URL")
    if not endpoint:
        message = (
            "Skipping live capability validation: no base URL was provided via --endpoint, "
            "INHIBITOR_API_URL, or INHIBITOR_BASE_URL."
        )
        print(message)
        return 1 if args.require_live else 0
    return run_live(args, cases, endpoint)


if __name__ == "__main__":
    sys.exit(main())
