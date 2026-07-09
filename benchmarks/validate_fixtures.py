#!/usr/bin/env python3
"""Validate benchmark suite manifest structure for Phase 2 scaffolding."""

from pathlib import Path
import sys

try:
    from lib.schema import require_fields, validate_support_level_value
except ImportError:  # pragma: no cover
    from benchmarks.lib.schema import require_fields, validate_support_level_value

BENCHMARKS_DIR = Path(__file__).resolve().parent
REPO_ROOT = BENCHMARKS_DIR.parent
MANIFEST_PATH = BENCHMARKS_DIR / "benchmark_suite.yaml"
REQUIRED_FIELDS = (
    "id",
    "name",
    "path",
    "category",
    "support_level",
    "required",
    "status",
    "description",
)


def _parse_scalar(raw_value):
    value = raw_value.strip()
    if value == "true":
        return True
    if value == "false":
        return False
    if len(value) >= 2 and value[0] == value[-1] == '"':
        return value[1:-1]
    return value


def load_suite_manifest(path=MANIFEST_PATH):
    """Load the simple benchmark suite YAML manifest without third-party dependencies."""

    # This is intentionally a minimal parser for the simple Phase 2 manifest
    # shape, not a general YAML parser. If the manifest grows more complex,
    # replace this with a documented YAML loader/dependency.
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    suites = []
    current = None
    pending_list_key = None

    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped == "suites:":
            continue
        if stripped.startswith("- ") and pending_list_key:
            current[pending_list_key].append(_parse_scalar(stripped[2:]))
            continue
        if stripped.startswith("- "):
            if current is not None:
                suites.append(current)
            current = {}
            pending_list_key = None
            key, sep, value = stripped[2:].partition(":")
            if not sep:
                raise ValueError(f"Malformed list item on line {line_number}.")
            current[key.strip()] = _parse_scalar(value)
            continue
        if current is None:
            raise ValueError(f"Unexpected content before first suite on line {line_number}.")
        key, sep, value = stripped.partition(":")
        if not sep:
            raise ValueError(f"Malformed key/value pair on line {line_number}.")
        key = key.strip()
        if value.strip() == "":
            current[key] = []
            pending_list_key = key
        else:
            current[key] = _parse_scalar(value)
            pending_list_key = None

    if current is not None:
        suites.append(current)
    return {"suites": suites}


def validate_manifest(manifest):
    """Validate manifest fields and referenced suite directories."""

    errors = []
    suites = manifest.get("suites")
    if not isinstance(suites, list) or not suites:
        return ["Manifest must contain a non-empty 'suites' list."]

    seen = set()
    for suite in suites:
        suite_id = suite.get("id", "<unknown>") if isinstance(suite, dict) else "<unknown>"
        try:
            require_fields(suite, REQUIRED_FIELDS)
            if suite["id"] in seen:
                raise ValueError(f"Duplicate suite id: {suite['id']}")
            seen.add(suite["id"])
            if suite["category"] not in {"core", "diagnostic"}:
                raise ValueError("Field 'category' must be 'core' or 'diagnostic'.")
            if suite["status"] != "planned":
                raise ValueError("Field 'status' must be 'planned'.")
            if not isinstance(suite["required"], bool):
                raise ValueError("Field 'required' must be true or false.")
            validate_support_level_value(suite["support_level"])
            suite_path = REPO_ROOT / suite["path"]
            if not suite_path.is_dir():
                raise ValueError(f"Referenced suite directory does not exist: {suite['path']}")
        except ValueError as exc:
            errors.append(f"{suite_id}: {exc}")
    return errors


def main():
    try:
        manifest = load_suite_manifest()
        errors = validate_manifest(manifest)
    except ValueError as exc:
        errors = [str(exc)]
        manifest = {"suites": []}

    if errors:
        print("Benchmark suite manifest validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    suites = manifest["suites"]
    core_count = sum(1 for suite in suites if suite["category"] == "core")
    diagnostic_count = sum(1 for suite in suites if suite["category"] == "diagnostic")
    print(
        "Benchmark suite manifest validation passed: "
        f"{len(suites)} planned suites ({core_count} core, {diagnostic_count} diagnostic)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
