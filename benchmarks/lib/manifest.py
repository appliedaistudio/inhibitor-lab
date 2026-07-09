"""Run manifest helpers for future benchmark executions."""

from datetime import datetime, timezone


def _utc_timestamp():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_run_manifest(
    suite_id=None,
    run_id=None,
    timestamp=None,
    benchmark_version=None,
    fixture_version=None,
    runner_version=None,
    endpoint=None,
    mode=None,
    environment=None,
    total_cases=None,
    notes=None,
):
    """Build a run manifest dictionary containing only known values."""

    timestamp = timestamp or _utc_timestamp()
    run_id = run_id or f"run-{timestamp.replace(':', '').replace('-', '').replace('Z', 'z')}"

    fields = {
        "suite_id": suite_id,
        "run_id": run_id,
        "timestamp": timestamp,
        "benchmark_version": benchmark_version,
        "fixture_version": fixture_version,
        "runner_version": runner_version,
        "endpoint": endpoint,
        "mode": mode,
        "environment": environment,
        "total_cases": total_cases,
        "notes": notes,
    }
    return {key: value for key, value in fields.items() if value is not None}
