#!/usr/bin/env python3
"""Lightweight benchmark orchestrator."""

import argparse
import sys

from validate_fixtures import load_suite_manifest, validate_manifest


def main():
    parser = argparse.ArgumentParser(description="List or run benchmark suites.")
    parser.add_argument("--suite", help="Only list or run a specific suite id.")
    parser.add_argument("--dry-run", action="store_true", help="Forward dry-run to executable suites that support it.")
    args = parser.parse_args()

    manifest = load_suite_manifest()
    errors = validate_manifest(manifest)
    if errors:
        print("Cannot run orchestrator because the manifest is invalid:")
        for error in errors:
            print(f"- {error}")
        return 1

    suites = manifest["suites"]
    if args.suite:
        suites = [suite for suite in suites if suite["id"] == args.suite]
        if not suites:
            print(f"Unknown suite requested: {args.suite}")
            return 1
        suite = suites[0]
        if suite["id"] == "runtime_trajectories":
            from core.runtime_trajectories import runner

            runner_args = ["--dry-run"] if args.dry_run else []
            return runner.main(runner_args)
        print(f"Runner for suite '{suite['id']}' is planned separately and is not active in this orchestrator; no benchmarks were executed.")
        return 0

    print("Benchmark suites:")
    for suite in suites:
        print(f"- {suite['id']} ({suite['category']}, {suite['status']}): {suite['path']}")
    print("No additional benchmark suites were executed; their orchestration is planned separately.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
