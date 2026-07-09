#!/usr/bin/env python3
"""Placeholder benchmark orchestrator for planned suites."""

import argparse
import sys

from validate_fixtures import load_suite_manifest, validate_manifest


def main():
    parser = argparse.ArgumentParser(description="List planned benchmark suites.")
    parser.add_argument("--suite", help="Only list a specific suite id.")
    args = parser.parse_args()

    manifest = load_suite_manifest()
    errors = validate_manifest(manifest)
    if errors:
        print("Cannot run placeholder orchestrator because the manifest is invalid:")
        for error in errors:
            print(f"- {error}")
        return 1

    suites = manifest["suites"]
    if args.suite:
        suites = [suite for suite in suites if suite["id"] == args.suite]
        if not suites:
            print(f"Unknown suite requested: {args.suite}")
            return 1

    print("Planned benchmark suites:")
    for suite in suites:
        print(f"- {suite['id']} ({suite['category']}, {suite['status']}): {suite['path']}")
    print("Actual suite runners will be added in later phases; no benchmarks were executed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
