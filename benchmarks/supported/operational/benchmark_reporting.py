"""Deterministic evidence packaging for the operational benchmark notebook."""

from __future__ import annotations

import json
import math
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


# Version derived artifacts independently so consumers can identify their schema.
ARTIFACT_SCHEMA_VERSION = "1.0"

# Record the approximation alongside workload provenance rather than implying exact tokenization.
TOKEN_ESTIMATION_METHOD = "approximate_character_count_divided_by_four"

# Histograms need enough observations to communicate a distribution responsibly.
MIN_HISTOGRAM_SAMPLE_COUNT = 10

# Key each formal chart's plain-language explanation by stable artifact name so
# report interpretation regenerates deterministically.
CHART_EXPLANATIONS = {
    "successful_latency_by_concurrency.png": (
        "This chart shows successful-response latency as concurrency increases. "
        "The median represents typical successful latency, while p95 and p99 expose "
        "tail behavior. Rising tail latency indicates that some successful requests "
        "are becoming slower under the tested burst pressure. Failed requests are "
        "excluded and reported separately."
    ),
    "successful_throughput_by_concurrency.png": (
        "This chart shows successful throughput separately for each mode. "
        "Each value is the number of successful requests for that mode divided "
        "by the shared stage duration. The aggregate stage throughput is the "
        "combined successful throughput of both modes. Insight and Performance "
        "lines may overlap when both modes complete the same number of requests "
        "within the same shared stage duration. Higher throughput means more "
        "successful work completed during the measured burst, but it does not "
        "establish the service's maximum sustainable capacity."
    ),
    "transport_success_rate_by_concurrency.png": (
        "This chart shows the proportion of attempted scored requests that completed "
        "successfully at the transport and API-response level. It measures operational "
        "reliability, not whether the returned safety reasoning was semantically correct."
    ),
    "response_anomaly_rate_by_concurrency.png": (
        "This chart shows the proportion of transport-successful scored responses that "
        "violated configured structural expectations, such as missing observations or "
        "predictions. A zero rate means no configured response-shape anomaly was detected; "
        "it does not establish semantic correctness."
    ),
    "recovery_latency_relative_to_baseline.png": (
        "Each pair of bars represents the post-burst recovery probes sent after "
        "a trial's final scored concurrency stage: one probe for Performance mode "
        "and one for Insight mode. Each bar is the recovery-probe latency divided "
        "by that same mode's concurrency-1 p50 latency from the same trial. "
        "The concurrency-1 p50 is the same-trial baseline: a local reference for "
        "the mode's typical successful latency before the higher-concurrency burst. "
        "The 1× line means the recovery probe completed at exactly the baseline "
        "latency. A value below 1× means the probe completed faster than its "
        "baseline reference. A value between 1× and 2× means it was slower than "
        "baseline but remained within the configured recovery rule. The 2× line "
        "is the configured maximum recovery latency. A value above 2× fails the "
        "latency portion of the recovery check. Passing this check is evidence of "
        "short-window post-burst responsiveness, not proof of sustained-load or "
        "production resilience."
    ),
    "transport_failure_rate_by_concurrency.png": (
    "This chart shows the proportion of scored requests that did not "
    "complete successfully at each concurrency level. It is generated "
    "only when at least one scored failure is present. Failure categories "
    "such as timeout, HTTP error, malformed response, API-declared error, "
    "or client exception are reported separately in the results table."
    ),
}
# Use the protocol's closed transport-failure taxonomy in every summary.
FAILURE_CATEGORIES = {
    "http_4xx", "http_5xx", "timeout", "api_declared_error",
    "malformed_json", "client_exception",
}
# Preserve a stable canonical column order even when interrupted runs omit observed fields.
REQUEST_RECORD_FIELDS = [
    "benchmark_run_id", "trial_id", "trial_number", "stage_id", "stage_sequence",
    "stage_type", "concurrency_level", "request_id", "user_slot", "repeat_index",
    "scenario_id", "mode", "request_started_at", "request_completed_at",
    "latency_ms", "success", "outcome", "http_status", "failure_category",
    "response_json", "response_text", "response_preview", "error_message",
    "anomaly_detected", "anomaly_codes", "anomaly_messages", "observation_count",
    "prediction_count", "scenario_expectations", "expected_min_observations",
    "expected_min_predictions", "expected_class", "stage_duration_seconds",
]


def build_run_output_directory(results_output_dir: Path, benchmark_run_id: str) -> Path:
    """Create a unique run directory and refuse to overwrite prior evidence."""
    run_dir = Path(results_output_dir) / benchmark_run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    (run_dir / "plots").mkdir()
    return run_dir


def make_json_serializable(value: Any) -> Any:
    """Convert pandas, NumPy, timestamp, and nested values to strict JSON values."""
    if isinstance(value, dict):
        return {str(key): make_json_serializable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, np.ndarray)):
        return [make_json_serializable(item) for item in value]
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if math.isnan(float(value)) or math.isinf(float(value)) else float(value)
    if value is pd.NA or value is pd.NaT:
        return None
    return value


def write_json(path: Path, payload: Any) -> None:
    """Write strict, human-readable JSON for deterministic artifacts."""
    path.write_text(
        json.dumps(make_json_serializable(payload), indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )


def checkpoint_json(path: Path, payload: Any) -> None:
    """Atomically replace JSON while preserving the previous valid checkpoint."""
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    write_json(temporary_path, payload)
    temporary_path.replace(path)


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> None:
    """Write one strict JSON object per line without flattening nested evidence."""
    with path.open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(make_json_serializable(record), ensure_ascii=False, allow_nan=False) + "\n")


def checkpoint_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> None:
    """Atomically replace canonical JSONL after a live evidence checkpoint."""
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    write_jsonl(temporary_path, records)
    temporary_path.replace(path)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    """Read canonical JSONL without flattening nested response evidence."""
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected a JSON object at {path}:{line_number}")
            records.append(value)
    return records


def load_existing_benchmark_run(run_dir: Path) -> dict[str, Any]:
    """Load canonical raw evidence as the source of reporting truth."""
    run_dir = Path(run_dir)

    # Require request evidence plus run and workload provenance before regenerating reports.
    required_paths = {
        "request_records": run_dir / "request_records.jsonl",
        "run_manifest": run_dir / "run_manifest.json",
        "scenario_manifest": run_dir / "scenario_manifest.json",
    }
    missing = [path for path in required_paths.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "Existing benchmark run is missing required canonical artifacts: "
            + ", ".join(str(path) for path in missing)
        )
    # Read only saved canonical artifacts; regeneration performs no API requests.
    request_records = read_jsonl(required_paths["request_records"])
    run_manifest = json.loads(required_paths["run_manifest"].read_text(encoding="utf-8"))
    scenario_manifest = json.loads(required_paths["scenario_manifest"].read_text(encoding="utf-8"))
    if not isinstance(run_manifest, dict) or not isinstance(scenario_manifest, dict):
        raise ValueError("Existing run manifests must contain JSON objects")
    return {
        "run_dir": run_dir,
        "request_records_df": normalize_request_records_dataframe(pd.DataFrame(request_records)),
        "run_manifest": run_manifest,
        "scenario_manifest": scenario_manifest,
    }


def normalize_request_records_dataframe(requests: pd.DataFrame) -> pd.DataFrame:
    """Restore canonical columns for empty runs while preserving additive fields."""
    normalized = requests.copy()
    # Restore absent canonical fields so early-interrupted runs remain reportable.
    for column in REQUEST_RECORD_FIELDS:
        if column not in normalized.columns:
            normalized[column] = pd.Series(index=normalized.index, dtype="object")
    # Retain additive fields after the canonical schema so extensions do not discard evidence.
    ordered_columns = [
        *REQUEST_RECORD_FIELDS,
        *[column for column in normalized.columns if column not in REQUEST_RECORD_FIELDS],
    ]
    return normalized.reindex(columns=ordered_columns)


def flatten_dataframe_for_csv(frame: pd.DataFrame) -> pd.DataFrame:
    """JSON-encode nested cells while retaining every request-evidence column."""
    flattened = frame.copy()
    for column in flattened.columns:
        if flattened[column].map(lambda value: isinstance(value, (dict, list, tuple, set))).any():
            flattened[column] = flattened[column].map(
                lambda value: json.dumps(make_json_serializable(value), ensure_ascii=False)
                if isinstance(value, (dict, list, tuple, set)) else value
            )
    return flattened


def build_scenario_manifest(scenarios: list[dict[str, Any]], scenario_file_hash: str) -> dict[str, Any]:
    # Capture normalized workload facts so the scenario provenance is reproducible.
    entries = []
    for scenario in scenarios:
        expectations = scenario["scenario_expectations"]
        entries.append({
            "scenario_id": scenario["scenario_id"],
            "example": scenario["example"],
            "title": scenario["title"],
            "thought_chain": scenario["thought_chain"],
            "expected_class": expectations["expected_class"],
            "expected_min_observations": expectations["expected_min_observations"],
            "expected_min_predictions": expectations["expected_min_predictions"],
            "message_count": scenario["message_count"],
            "character_count": scenario["character_count"],
            "word_count": scenario["word_count"],
            "estimated_input_tokens": scenario["estimated_input_tokens"],
            "token_estimation_method": TOKEN_ESTIMATION_METHOD,
        })
    return {"scenario_file_sha256": scenario_file_hash, "scenarios": entries}


def build_anomaly_tables(scored: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    # Declare stable empty schemas so deterministic exports survive runs without scored rows.
    summary_columns = [
        "trial_number", "concurrency_level", "mode", "successful_responses",
        "anomalous_responses", "anomaly_rate",
    ]
    breakdown_columns = [
        "anomaly_code", "count", "affected_trials", "affected_concurrency_levels",
        "affected_modes", "affected_scenarios",
    ]
    if scored.empty:
        return pd.DataFrame(columns=summary_columns), pd.DataFrame(columns=breakdown_columns)
    # Measure structural anomalies only among transport-successful scored responses.
    rows = []
    for keys, group in scored.groupby(["trial_number", "concurrency_level", "mode"], sort=True):
        successful = group[group["success"].eq(True)]
        anomalous = successful[successful["anomaly_detected"].eq(True)]
        rows.append({
            "trial_number": keys[0], "concurrency_level": keys[1], "mode": keys[2],
            "successful_responses": len(successful), "anomalous_responses": len(anomalous),
            "anomaly_rate": len(anomalous) / len(successful) if len(successful) else 0.0,
        })
    # Expand anomaly codes only for the detailed evidence index; these checks do not prove semantics.
    anomalous = scored[scored["success"].eq(True) & scored["anomaly_detected"].eq(True)]
    if anomalous.empty:
        return pd.DataFrame(rows, columns=summary_columns), pd.DataFrame(columns=breakdown_columns)
    exploded = anomalous.explode("anomaly_codes").rename(columns={"anomaly_codes": "anomaly_code"})
    breakdown = exploded.groupby("anomaly_code", as_index=False).agg(
        count=("request_id", "size"),
        affected_trials=("trial_number", lambda values: sorted(set(values))),
        affected_concurrency_levels=("concurrency_level", lambda values: sorted(set(values))),
        affected_modes=("mode", lambda values: sorted(set(values))),
        affected_scenarios=("scenario_id", lambda values: sorted(set(values))),
    )
    return pd.DataFrame(rows, columns=summary_columns), breakdown[breakdown_columns]


def _rate(numerator: int, denominator: int) -> float:
    # Represent an empty evidence group as zero rather than permitting division by zero.
    return numerator / denominator if denominator else 0.0


def _throughput(count: int, duration_seconds: Any) -> float | None:
    # Reject missing or non-positive timing evidence instead of inventing a throughput value.
    if duration_seconds is None or pd.isna(duration_seconds) or float(duration_seconds) <= 0:
        return None
    return count / float(duration_seconds)


def _latency_metrics(values: pd.Series) -> dict[str, float | None]:
    # Coerce recorded latencies once so every reported percentile uses the same valid sample.
    numeric = pd.to_numeric(values, errors="coerce").dropna()
    if numeric.empty:
        return {name: None for name in (
            "mean_latency_ms", "p50_latency_ms", "p95_latency_ms",
            "p99_latency_ms", "max_latency_ms",
        )}
    return {
        "mean_latency_ms": float(numeric.mean()),
        "p50_latency_ms": float(numeric.quantile(0.50)),
        "p95_latency_ms": float(numeric.quantile(0.95)),
        "p99_latency_ms": float(numeric.quantile(0.99)),
        "max_latency_ms": float(numeric.max()),
    }


def rebuild_per_trial_summary(scored: pd.DataFrame) -> pd.DataFrame:
    """Rebuild the established trial metrics solely from canonical request JSONL."""
    if scored.empty:
        return pd.DataFrame()
    # Aggregate by trial, shared stage, concurrency, and mode without mixing recovery probes.
    rows: list[dict[str, Any]] = []
    keys = ["trial_id", "trial_number", "stage_id", "concurrency_level", "mode"]
    for values, group in scored.groupby(keys, sort=True):
        success_mask = group["success"].fillna(False).astype(bool)
        attempts = len(group)
        successes = int(success_mask.sum())
        failures = attempts - successes
        # Classify every unsuccessful scored request with the fixed transport taxonomy.
        categories = group.get("failure_category", pd.Series(None, index=group.index))
        category_counts = {name: int(categories.eq(name).sum()) for name in FAILURE_CATEGORIES}
        failed_latency = pd.to_numeric(group.loc[~success_mask, "latency_ms"], errors="coerce").dropna()
        # Use the shared stage duration so per-mode throughput is comparable within the stage.
        duration = pd.to_numeric(group.get("stage_duration_seconds"), errors="coerce").dropna()
        duration_seconds = float(duration.iloc[0]) if not duration.empty else None
        anomalous = int((success_mask & group["anomaly_detected"].fillna(False).astype(bool)).sum())
        # Keep successful latency, failed latency, transport, throughput, and anomaly evidence distinct.
        rows.append({
            "trial_id": values[0], "trial_number": int(values[1]),
            "concurrency_level": int(values[3]), "mode": values[4],
            "attempt_count": attempts, "success_count": successes,
            "failure_count": failures, "success_rate": _rate(successes, attempts),
            "failure_rate": _rate(failures, attempts),
            **_latency_metrics(group.loc[success_mask, "latency_ms"]),
            "failure_p50_latency_ms": float(failed_latency.quantile(.50)) if not failed_latency.empty else None,
            "failure_p95_latency_ms": float(failed_latency.quantile(.95)) if not failed_latency.empty else None,
            "failure_max_latency_ms": float(failed_latency.max()) if not failed_latency.empty else None,
            "attempted_throughput_rps": _throughput(attempts, duration_seconds),
            "successful_throughput_rps": _throughput(successes, duration_seconds),
            "failed_completion_rps": _throughput(failures, duration_seconds),
            **{f"{name}_count": category_counts[name] for name in FAILURE_CATEGORIES},
            "timeout_rate": _rate(category_counts["timeout"], attempts),
            "http_4xx_rate": _rate(category_counts["http_4xx"], attempts),
            "http_5xx_rate": _rate(category_counts["http_5xx"], attempts),
            "api_declared_error_rate": _rate(category_counts["api_declared_error"], attempts),
            "malformed_response_rate": _rate(category_counts["malformed_json"], attempts),
            "client_exception_rate": _rate(category_counts["client_exception"], attempts),
            "anomalous_response_count": anomalous,
            "anomalous_response_rate": _rate(anomalous, successes),
            "stage_duration_seconds": duration_seconds,
        })
    return pd.DataFrame(rows).sort_values(["trial_number", "concurrency_level", "mode"])


def rebuild_cross_trial_summary(per_trial: pd.DataFrame) -> pd.DataFrame:
    """Apply the established equal-trial median and range aggregation."""
    rows: list[dict[str, Any]] = []
    # Give each trial equal weight by aggregating the already-normalized per-trial rows.
    metrics = {
        "success_rate": ("median", "min", "max"),
        "p50_latency_ms": ("median", "min", "max"),
        "p95_latency_ms": ("median", "min", "max"),
        "p99_latency_ms": ("median", "min", "max"),
        "successful_throughput_rps": ("median", "min", "max"),
        "attempted_throughput_rps": ("median", "min", "max"),
        "anomalous_response_rate": ("median", "max"),
    }
    if per_trial.empty:
        return pd.DataFrame()
    for (concurrency, mode), group in per_trial.groupby(["concurrency_level", "mode"], sort=True):
        row: dict[str, Any] = {
            "concurrency_level": int(concurrency), "mode": mode,
            "trial_count": int(group["trial_number"].nunique()),
            "anomalous_response_count_total": int(group["anomalous_response_count"].sum()),
        }
        # Preserve both central tendency and observed range without pooling request samples.
        for metric, operations in metrics.items():
            available = pd.to_numeric(group[metric], errors="coerce").dropna()
            for operation in operations:
                row[f"{metric}_{operation}"] = float(getattr(available, operation)()) if not available.empty else None
        row["success_rate_trial_count"] = int(group["success_rate"].count())
        row["latency_trial_count"] = int(group["p50_latency_ms"].count())
        row["throughput_trial_count"] = int(group["successful_throughput_rps"].count())
        row["anomaly_rate_trial_count"] = int(group["anomalous_response_rate"].count())
        rows.append(row)
    return pd.DataFrame(rows)


def rebuild_recovery_summary(
    recovery_records: pd.DataFrame, per_trial: pd.DataFrame, modes: list[str],
) -> pd.DataFrame:
    """Reapply the unchanged recovery rule to canonical probe records."""
    rows: list[dict[str, Any]] = []
    # Evaluate diagnostic probes independently for each recorded trial.
    trial_numbers = sorted(set(recovery_records.get("trial_number", pd.Series(dtype=int)).dropna()))
    for trial_number in trial_numbers:
        result: dict[str, Any] = {"trial_number": int(trial_number)}
        unavailable: list[str] = []
        failed: list[str] = []
        trial_probes = recovery_records[recovery_records["trial_number"].eq(trial_number)]
        trial_summary = (
            per_trial[per_trial["trial_number"].eq(trial_number)]
            if "trial_number" in per_trial
            else pd.DataFrame(columns=["concurrency_level", "mode", "p50_latency_ms"])
        )
        # Compare each mode only with its same-trial concurrency-1 successful-latency baseline.
        for mode in modes:
            prefix = mode.lower()
            probe = trial_probes[trial_probes["mode"].str.lower().eq(prefix)]
            baseline = trial_summary[trial_summary["concurrency_level"].eq(1) & trial_summary["mode"].str.lower().eq(prefix)]
            record = probe.iloc[0] if len(probe) == 1 else None
            baseline_ms = baseline["p50_latency_ms"].iloc[0] if len(baseline) == 1 else None
            baseline_ms = None if baseline_ms is None or pd.isna(baseline_ms) else float(baseline_ms)
            result[f"{prefix}_success"] = bool(record["success"]) if record is not None else False
            result[f"{prefix}_latency_ms"] = float(record["latency_ms"]) if record is not None else None
            result[f"{prefix}_anomaly_detected"] = bool(record["anomaly_detected"]) if record is not None else None
            result[f"{prefix}_baseline_p50_ms"] = baseline_ms
            result[f"{prefix}_latency_limit_ms"] = 2 * baseline_ms if baseline_ms is not None else None
            # Apply the configured 2x protocol rule, which is not a universal service-level objective.
            if baseline_ms is None:
                unavailable.append(f"{mode} concurrency-1 successful latency baseline unavailable")
            elif record is None:
                failed.append(f"{mode} recovery response missing")
            elif not bool(record["success"]):
                failed.append(f"{mode} transport failure")
            elif bool(record["anomaly_detected"]):
                failed.append(f"{mode} response anomaly detected")
            elif float(record["latency_ms"]) > 2 * baseline_ms:
                failed.append(f"{mode} latency exceeded twice its same-trial baseline")
        # Missing baseline evidence takes precedence because the recovery rule cannot be evaluated.
        status = "not_evaluable" if unavailable else "failed" if failed else "passed"
        reasons = unavailable + failed if unavailable else failed or ["Both modes passed transport, integrity, and latency checks"]
        result.update({"recovery_probe_status": status, "recovery_probe_reason": "; ".join(reasons)})
        rows.append(result)
    return normalize_recovery_summary(pd.DataFrame(rows))


def normalize_recovery_summary(frame: pd.DataFrame) -> pd.DataFrame:
    # Normalize legacy column names and empty runs into the stable derived-summary schema.
    columns = [
        "trial_number", "performance_success", "insight_success",
        "performance_anomaly_detected", "insight_anomaly_detected",
        "performance_latency_ms", "insight_latency_ms",
        "performance_baseline_p50_ms", "insight_baseline_p50_ms",
        "performance_latency_limit_ms", "insight_latency_limit_ms",
        "recovery_probe_status", "recovery_probe_reason",
    ]
    result = frame.rename(columns={
        "performance_recovery_latency_limit_ms": "performance_latency_limit_ms",
        "insight_recovery_latency_limit_ms": "insight_latency_limit_ms",
    }).copy()
    for column in columns:
        if column not in result:
            result[column] = None
    return result[columns]


def build_deterministic_findings(
    per_trial: pd.DataFrame, cross_trial: pd.DataFrame, scored: pd.DataFrame,
    recovery: pd.DataFrame,
) -> list[str]:
    # Generate findings from sorted aggregates so identical evidence yields identical prose.
    findings: list[str] = []
    throughput_column = "successful_throughput_rps_median"
    available = cross_trial.dropna(subset=[throughput_column]) if throughput_column in cross_trial else pd.DataFrame()
    if not available.empty:
        # Include every mode tied for the maximum instead of selecting an arbitrary first row.
        maximum_throughput = float(
            available[throughput_column].max()
        )

        maximum_rows = available[
            np.isclose(
                available[throughput_column],
                maximum_throughput,
            )
        ].copy()

        concurrency_levels = sorted(
            {
                int(value)
                for value in maximum_rows[
                    "concurrency_level"
                ]
            }
        )

        modes = sorted(
            {
                str(value).title()
                for value in maximum_rows[
                    "mode"
                ]
            }
        )

        concurrency_text = " and ".join(
            str(level)
            for level in concurrency_levels
        )

        mode_text = " and ".join(
            modes
        )

        findings.append(
            "The highest median successful throughput observed was "
            f"{maximum_throughput:.2f} requests/second at concurrency "
            f"{concurrency_text} for {mode_text} "
            f"{'modes' if len(modes) > 1 else 'mode'}."
        )

    # Combine successful requests across configured modes sharing a trial and concurrency stage.
    if not per_trial.empty:
        aggregate_rows: list[dict[str, Any]] = []

        for (
            trial_number,
            concurrency_level,
        ), group in per_trial.groupby(
            [
                "trial_number",
                "concurrency_level",
            ],
            sort=True,
        ):
            # Reuse the shared stage duration rather than summing mode-level durations.
            stage_duration_values = pd.to_numeric(
                group["stage_duration_seconds"],
                errors="coerce",
            ).dropna()

            if stage_duration_values.empty:
                continue

            stage_duration_seconds = float(
                stage_duration_values.iloc[0]
            )

            successful_requests = int(
                group["success_count"].sum()
            )

            if stage_duration_seconds <= 0:
                continue

            aggregate_rows.append(
                {
                    "trial_number": int(
                        trial_number
                    ),
                    "concurrency_level": int(
                        concurrency_level
                    ),
                    "aggregate_successful_throughput_rps": (
                        successful_requests
                        / stage_duration_seconds
                    ),
                }
            )

        aggregate_frame = pd.DataFrame(
            aggregate_rows
        )

        if not aggregate_frame.empty:
            highest_aggregate = aggregate_frame.loc[
                aggregate_frame[
                    "aggregate_successful_throughput_rps"
                ].idxmax()
            ]

            findings.append(
                "The highest aggregate successful stage throughput "
                f"observed was "
                f"{highest_aggregate['aggregate_successful_throughput_rps']:.2f} "
                "requests/second at concurrency "
                f"{int(highest_aggregate['concurrency_level'])} "
                "in trial "
                f"{int(highest_aggregate['trial_number'])}."
            )

    # Count successful observations so percentile findings exclude under-supported groups.
    insight_sample_counts = (
        per_trial[
            per_trial["mode"].eq("insight")
        ]
        .groupby(
            "concurrency_level",
            as_index=False,
        )["success_count"]
        .sum()
        .rename(
            columns={
                "success_count": "total_success_count",
            }
        )
    )

    insight = cross_trial[cross_trial.get("mode",pd.Series(dtype=str),).eq("insight")].copy()

    if (not insight.empty and "concurrency_level" in insight and "p95_latency_ms_median" in insight):
        # Join canonical success counts because aggregate percentile rows omit request sample size.
        insight = insight.merge(
            insight_sample_counts,
            on="concurrency_level",
            how="left",
        )

        values = (
            insight[
                insight["total_success_count"]
                .fillna(0)
                .ge(2)
            ]
            .dropna(
                subset=["p95_latency_ms_median"]
            )
            .sort_values("concurrency_level")
        )

        if len(values) >= 2:
            first = values.iloc[0]
            last = values.iloc[-1]

            findings.append(
                "Insight 95th-percentile successful latency was "
                f"{first['p95_latency_ms_median']:.2f} ms "
                "at concurrency "
                f"{int(first['concurrency_level'])} and "
                f"{last['p95_latency_ms_median']:.2f} ms "
                "at concurrency "
                f"{int(last['concurrency_level'])}."
            )    
    # Summarize transport, structural anomaly, and recovery evidence as separate findings.
    attempts = len(scored)
    failures = int((~scored["success"].fillna(False)).sum()) if not scored.empty else 0
    anomalies = int((scored.get("success", False).eq(True) & scored.get("anomaly_detected", False).eq(True)).sum()) if not scored.empty else 0
    findings.append(f"{failures} transport failures were recorded across {attempts} attempted scored requests.")
    findings.append(f"{anomalies} transport-successful responses contained one or more configured anomalies.")
    statuses = sorted(set(recovery.get("recovery_probe_status", pd.Series(dtype=str)).dropna().astype(str)))
    findings.append(f"Recovery probe status recorded: {', '.join(statuses) if statuses else 'not evaluable'}.")
    findings.append("No formal acceptance threshold was configured for latency, throughput, transport success, or anomaly rate.")
    return findings


def _save_line_chart(
    frame: pd.DataFrame,
    metrics: list[tuple[str, str]],
    title: str,
    ylabel: str,
    path: Path,
    y_limits: tuple[float, float] | None = None,
) -> bool:
    """Save a multi-mode line chart when at least one requested metric is available."""
    if frame.empty:
        return False

    # Build plots from sorted aggregate evidence so regeneration is visually deterministic.
    fig, ax = plt.subplots(figsize=(10, 6))
    plotted = False

    for mode, group in frame.groupby("mode"):
        group = group.sort_values("concurrency_level")

        for column, label in metrics:
            if column in group and group[column].notna().any():
                ax.plot(
                    group["concurrency_level"],
                    group[column],
                    marker="o",
                    label=f"{str(mode).title()} — {label}",
                )
                plotted = True

    if not plotted:
        plt.close(fig)
        return False

    ax.set(
        title=title,
        xlabel="Concurrent users",
        ylabel=ylabel,
    )

    # Fixed limits make rate charts directly comparable across runs.
    if y_limits is not None:
        ax.set_ylim(*y_limits)

    ax.grid(alpha=0.3)
    # Keep legends outside the plotting area so they cannot obscure data.
    ax.legend(
        loc="upper left",
        bbox_to_anchor=(1.02, 1.0),
        borderaxespad=0.0,
    )

    fig.tight_layout()

    # Preserve the external legend in the saved image.
    fig.savefig(
        path,
        dpi=160,
        bbox_inches="tight",
    )
    plt.close(fig)
    return True

def generate_formal_charts(
    cross_trial: pd.DataFrame,
    scored: pd.DataFrame,
    recovery: pd.DataFrame,
    concurrency_levels: list[int],
    plots_dir: Path,
) -> list[Path]:
    """Generate formal charts without changing benchmark scoring or recovery rules."""
    plots_dir.mkdir(parents=True, exist_ok=True)

    # Restrict charts to configured stages so stray evidence cannot alter the formal views.
    active = (
        cross_trial[
            cross_trial["concurrency_level"].isin(concurrency_levels)
        ].copy()
        if not cross_trial.empty
        else cross_trial
    )

    generated: list[Path] = []

    # Define filenames, titles, and metrics centrally so chart artifacts regenerate consistently.
    chart_specs = [
        (
            "successful_latency_by_concurrency.png",
            [
                ("p50_latency_ms_median", "p50"),
                ("p95_latency_ms_median", "p95"),
                ("p99_latency_ms_median", "p99"),
            ],
            "Successful-response latency by concurrency",
            "Latency (ms)",
            None,
        ),
        (
            "successful_throughput_by_concurrency.png",
            [
                (
                    "successful_throughput_rps_median",
                    "Successful throughput",
                )
            ],
            "Successful throughput by concurrency",
            "Successful requests/second",
            None,
        ),
        (
            "transport_success_rate_by_concurrency.png",
            [("success_rate_median", "Transport success rate")],
            "Transport success rate by concurrency",
            "Transport success rate",
            (0.0, 1.05),
        ),
        (
            "response_anomaly_rate_by_concurrency.png",
            [
                (
                    "anomalous_response_rate_median",
                    "Response anomaly rate",
                )
            ],
            "Response anomaly rate by concurrency",
            "Response anomaly rate",
            (0.0, 1.05),
        ),
    ]

    for (
        filename,
        metrics,
        title,
        ylabel,
        y_limits,
    ) in chart_specs:
        path = plots_dir / filename

        if _save_line_chart(
            active,
            metrics,
            title,
            ylabel,
            path,
            y_limits=y_limits,
        ):
            generated.append(path)

    # Generate a failure-rate chart only when the run contains scored failures.
    failed_requests = scored[
        scored["success"].fillna(False).eq(False)
    ].copy()

    if not failed_requests.empty:
        # Derive failure rates from scored traffic only; recovery probes remain diagnostic.
        failure_rate_rows: list[dict[str, Any]] = []

        for (
            concurrency_level,
            mode,
        ), group in scored.groupby(
            ["concurrency_level", "mode"],
            sort=True,
        ):
            success_mask = (
                group["success"]
                .fillna(False)
                .astype(bool)
            )

            attempted_requests = len(group)
            failed_request_count = int(
                (~success_mask).sum()
            )

            failure_rate_rows.append(
                {
                    "concurrency_level": int(
                        concurrency_level
                    ),
                    "mode": mode,
                    "failure_rate": (
                        failed_request_count
                        / attempted_requests
                        if attempted_requests
                        else 0.0
                    ),
                }
            )

        failure_rate_frame = pd.DataFrame(
            failure_rate_rows
        )

        failure_chart_path = (
            plots_dir
            / "transport_failure_rate_by_concurrency.png"
        )

        if _save_line_chart(
            failure_rate_frame,
            [
                (
                    "failure_rate",
                    "Transport failure rate",
                )
            ],
            "Transport failure rate by concurrency",
            "Transport failure rate",
            failure_chart_path,
            y_limits=(0.0, 1.05),
        ):
            generated.append(
                failure_chart_path
            )

    # Express each recovery probe against its mode-specific same-trial baseline.
    if not recovery.empty:
        recovery_plot_rows: list[dict[str, Any]] = []

        for _, row in recovery.iterrows():
            trial_number = int(row["trial_number"])

            for mode in ("performance", "insight"):
                latency_ms = pd.to_numeric(
                    pd.Series([row.get(f"{mode}_latency_ms")]),
                    errors="coerce",
                ).iloc[0]

                baseline_ms = pd.to_numeric(
                    pd.Series([row.get(f"{mode}_baseline_p50_ms")]),
                    errors="coerce",
                ).iloc[0]

                # Omit ratios without a valid baseline rather than manufacturing recovery evidence.
                if (
                    pd.isna(latency_ms)
                    or pd.isna(baseline_ms)
                    or float(baseline_ms) <= 0
                ):
                    continue

                recovery_plot_rows.append(
                    {
                        "trial_number": trial_number,
                        "mode": mode,
                        "latency_ratio": (
                            float(latency_ms)
                            / float(baseline_ms)
                        ),
                    }
                )

        recovery_plot = pd.DataFrame(recovery_plot_rows)

        if not recovery_plot.empty:
            fig, ax = plt.subplots(figsize=(10, 6))

            # Sort trial positions so identical recovery evidence produces identical bar ordering.
            trial_numbers = sorted(
                recovery_plot["trial_number"].unique()
            )
            x = np.arange(len(trial_numbers))
            width = 0.35

            for offset, mode in [
                (-width / 2, "performance"),
                (width / 2, "insight"),
            ]:
                mode_rows = (
                    recovery_plot[
                        recovery_plot["mode"].eq(mode)
                    ]
                    .set_index("trial_number")
                    .reindex(trial_numbers)
                )

                ratios = mode_rows["latency_ratio"]

                bars = ax.bar(
                    x + offset,
                    ratios,
                    width,
                    label=f"{mode.title()} recovery",
                )

                # Numeric labels make the recovery decision auditable at a glance.
                for bar, ratio in zip(bars, ratios):
                    if pd.notna(ratio):
                        ax.text(
                            bar.get_x()
                            + bar.get_width() / 2,
                            bar.get_height(),
                            f"{ratio:.2f}×",
                            ha="center",
                            va="bottom",
                        )

            # The 1× line marks latency equal to the mode's same-trial concurrency-1 p50.
            ax.axhline(
                1.0,
                linestyle="--",
                linewidth=1.5,
                label="Concurrency-1 baseline (1×)",
            )

            # Show the protocol's configured 2x rule without presenting it as a universal SLO.
            ax.axhline(
                2.0,
                linestyle=":",
                linewidth=2,
                label="Recovery pass limit (2×)",
)

            ax.set(
                title=(
                    "Post-burst recovery latency "
                    "relative to baseline"
                ),
                xlabel="Trial",
                ylabel=(
                    "Recovery latency relative to "
                    "same-trial concurrency-1 p50"
                ),
            )
            ax.set_xticks(
                x,
                [
                    str(trial_number)
                    for trial_number in trial_numbers
                ],
            )
            ax.set_ylim(bottom=0)
            ax.grid(axis="y", alpha=0.3)
            # Place the legend outside the axes so it cannot obscure bars or reference lines.
            ax.legend(
                loc="upper left",
                bbox_to_anchor=(1.02, 1.0),
                borderaxespad=0.0,
            )

            fig.tight_layout()

            path = (
                plots_dir
                / "recovery_latency_relative_to_baseline.png"
            )
            # Preserve the external legend in the exported image.
            fig.savefig(
                path,
                dpi=160,
                bbox_inches="tight",
            )
            plt.close(fig)
            generated.append(path)

    # Histograms describe only successful scored latency and never include recovery probes.
    successful = (
        scored[scored["success"].eq(True)]
        if not scored.empty
        else scored
    )

    for level in concurrency_levels:
        modes = (
            sorted(successful["mode"].dropna().unique())
            if not successful.empty
            else []
        )

        for mode in modes:
            values = successful[
                successful["concurrency_level"].eq(level)
                & successful["mode"].eq(mode)
            ]["latency_ms"].dropna()

            # Suppress undersized distributions so sparse samples are not visually overstated.
            if len(values) < MIN_HISTOGRAM_SAMPLE_COUNT:
                continue

            fig, ax = plt.subplots(figsize=(9, 5))
            ax.hist(
                values,
                bins=min(30, max(5, int(math.sqrt(len(values))))),
                edgecolor="black",
                alpha=0.8,
            )
            ax.set(
                title=(
                    "Successful latency distribution — "
                    f"concurrency {level}, "
                    f"{str(mode).title()}"
                ),
                xlabel="Latency (ms)",
                ylabel="Successful responses",
            )
            fig.tight_layout()

            path = (
                plots_dir
                / f"successful_latency_hist_c{level}_{mode}.png"
            )
            fig.savefig(path, dpi=160)
            plt.close(fig)
            generated.append(path)

    return generated

def _markdown_table(frame: pd.DataFrame, columns: list[str], rename: dict[str, str]) -> str:
    # Select only available columns so partial runs retain a stable readable fallback.
    available = [column for column in columns if column in frame]
    return "_No data available._" if frame.empty or not available else frame[available].rename(columns=rename).to_markdown(index=False)



def _build_chart_markdown(
    plot_paths: list[Path],
    scored: pd.DataFrame,
) -> str:
    """Build chart subsections with interpretation and sample-size boundaries."""
    sections: list[str] = []

    # Preserve caller-provided artifact order so regenerated report sections remain stable.
    for path in plot_paths:
        # Convert histogram filenames into reader-friendly chart titles.
        if path.name.startswith("successful_latency_hist_"):
            parts = path.stem.split("_")

            concurrency_token = next(
                part
                for part in parts
                if part.startswith("c")
                and part[1:].isdigit()
            )

            mode = parts[-1].title()
            concurrency_level = concurrency_token[1:]

            title = (
                "Successful latency distribution — "
                f"concurrency {concurrency_level}, {mode}"
            )
        else:
            # Derive formal chart headings from stable artifact names.
            title = path.stem.replace("_", " ").title()
        # Histogram explanations depend on the encoded concurrency level and mode.
        if path.name.startswith("successful_latency_hist_"):
            explanation = (
                "This histogram shows the distribution of successful request "
                "latencies for one mode at one concurrency level. Taller bars "
                "indicate latency ranges containing more successful responses. "
                "A narrow concentration suggests relatively consistent response "
                "times, while a wider or right-skewed distribution indicates "
                "greater variability or a slower latency tail. Failed requests "
                "are excluded and reported separately."
            )
        else:
            explanation = CHART_EXPLANATIONS.get(
                path.name,
                (
                    "This chart is a deterministic reporting view derived "
                    "from the benchmark's recorded evidence."
                ),
            )

        sections.append(
            "\n".join(
                [
                    f"### {title}",
                    "",
                    f"![{title}](plots/{path.name})",
                    "",
                    explanation,
                ]
            )
        )

    # Count the same successful scored samples used for histogram eligibility.
    successful = (
        scored[scored["success"].eq(True)]
        if not scored.empty
        else scored
    )

    group_sizes = (
        successful.groupby(
            ["concurrency_level", "mode"],
            dropna=False,
        )
        .size()
        if not successful.empty
        else pd.Series(dtype=int)
    )

    histogram_paths = [
        path
        for path in plot_paths
        if path.name.startswith("successful_latency_hist_")
    ]

    # Explain why small-sample runs may omit all latency histograms.
    if not group_sizes.empty and not histogram_paths:
        sections.append(
            (
                "### Latency histogram availability\n\n"
                "Latency histograms were not generated because no "
                "concurrency-and-mode group contained at least "
                f"{MIN_HISTOGRAM_SAMPLE_COUNT} successful observations. "
                "This avoids presenting very small samples as meaningful "
                "latency distributions."
            )
        )

    return (
        "\n\n".join(sections)
        if sections
        else "_No charts were evaluable from the available evidence._"
    )


def _build_recovery_ratio_summary(
    recovery: pd.DataFrame,
) -> str:
    """Summarize evaluable recovery ratios without changing the recovery decision."""
    ratio_descriptions: list[str] = []

    # Report only ratios supported by both a probe latency and a positive local baseline.
    for _, row in recovery.iterrows():
        trial_number = int(row["trial_number"])

        for mode in ("performance", "insight"):
            latency = row.get(f"{mode}_latency_ms")
            baseline = row.get(f"{mode}_baseline_p50_ms")

            if (
                latency is None
                or baseline is None
                or pd.isna(latency)
                or pd.isna(baseline)
                or float(baseline) <= 0
            ):
                continue

            ratio = float(latency) / float(baseline)
            ratio_descriptions.append(
                f"trial {trial_number} {mode.title()}: {ratio:.2f}× baseline"
            )

    if not ratio_descriptions:
        return "No recovery latency ratio was evaluable from the recorded evidence."

    return "Recorded recovery ratios: " + "; ".join(ratio_descriptions) + "."

def _build_recovery_interpretation(
    recovery: pd.DataFrame,
) -> str:
    """Describe the recorded recovery outcome without overstating the evidence."""
    if recovery.empty:
        return (
            "No recovery evidence was available, so short-window "
            "post-burst responsiveness could not be evaluated."
        )

    # Keep passed, failed, and unevaluable outcomes distinct to avoid overstating recovery.
    passed_trials = 0
    failed_descriptions: list[str] = []
    unavailable_descriptions: list[str] = []

    for _, row in recovery.iterrows():
        trial_number = int(row["trial_number"])
        status = str(
            row.get(
                "recovery_probe_status",
                "not_evaluable",
            )
        )

        if status == "passed":
            passed_trials += 1
            continue

        if status == "not_evaluable":
            unavailable_descriptions.append(
                f"trial {trial_number}: "
                f"{row.get('recovery_probe_reason', 'baseline unavailable')}"
            )
            continue

        mode_failures: list[str] = []

        # Reconstruct mode-specific reasons from the recorded derived evidence.
        for mode in ("performance", "insight"):
            mode_title = mode.title()
            success = bool(
                row.get(
                    f"{mode}_success",
                    False,
                )
            )
            anomaly_detected = bool(
                row.get(
                    f"{mode}_anomaly_detected",
                    False,
                )
            )
            latency = row.get(
                f"{mode}_latency_ms"
            )
            latency_limit = row.get(
                f"{mode}_latency_limit_ms"
            )

            if not success:
                mode_failures.append(
                    f"{mode_title} did not complete successfully"
                )
            elif anomaly_detected:
                mode_failures.append(
                    f"{mode_title} returned a configured response anomaly"
                )
            elif (
                latency is not None
                and latency_limit is not None
                and not pd.isna(latency)
                and not pd.isna(latency_limit)
                and float(latency) > float(latency_limit)
            ):
                mode_failures.append(
                    f"{mode_title} exceeded its configured "
                    "2× latency limit"
                )

        if mode_failures:
            failed_descriptions.append(
                f"trial {trial_number}: "
                + "; ".join(mode_failures)
            )
        else:
            failed_descriptions.append(
                f"trial {trial_number}: "
                f"{row.get('recovery_probe_reason', 'recovery rule failed')}"
            )

    if failed_descriptions:
        failure_text = "; ".join(
            failed_descriptions
        )

        return (
            "The service remained available after the burst, but did not "
            "fully satisfy the configured short-window recovery rule. "
            f"Recorded recovery failures: {failure_text}. "
            "This is a diagnostic recovery signal, not evidence of a "
            "transport outage or a production-resilience certification."
        )

    if unavailable_descriptions:
        unavailable_text = "; ".join(
            unavailable_descriptions
        )

        return (
            "The recovery probes completed, but the configured recovery "
            "rule could not be fully evaluated. "
            f"Unavailable evidence: {unavailable_text}."
        )

    return (
        f"All {passed_trials} evaluated trial(s) satisfied the configured "
        "short-window recovery rule. Both modes completed successfully, "
        "returned no configured response anomalies, and remained within "
        "their respective 2× same-trial latency limits. This is evidence "
        "of short-window post-burst responsiveness under this protocol, "
        "not proof of sustained-load or production resilience."
    )

def _build_recovery_baseline_note(
    per_trial: pd.DataFrame,
) -> str:
    """Explain when recovery baselines rely on very small samples."""
    if per_trial.empty:
        return ""

    # Recovery references are mode-specific concurrency-1 rows from the same trial.
    baseline_rows = per_trial[
        per_trial["concurrency_level"].eq(1)
    ]

    if baseline_rows.empty:
        return (
            "No concurrency-1 baseline rows were available, so recovery "
            "latency comparisons may not be evaluable."
        )

    # Flag one-observation p50 values as diagnostic rather than statistically stable.
    low_sample_rows = baseline_rows[
        baseline_rows["success_count"].fillna(0).astype(int) < 2
    ]

    if low_sample_rows.empty:
        return ""

    affected = ", ".join(
        sorted(
            {
                (
                    f"trial {int(row['trial_number'])} "
                    f"{str(row['mode']).title()}"
                )
                for _, row in low_sample_rows.iterrows()
            }
        )
    )

    return (
        "The following recovery baselines contain only one successful "
        f"concurrency-1 observation: {affected}. In those cases, the reported "
        "p50 baseline is equal to that single request latency. The resulting "
        "recovery ratios should be interpreted as diagnostic signals rather "
        "than stable latency estimates."
    )

# Keep protocol limitations explicit and deterministic across every rendered report.
CLAIM_BOUNDARIES = [
    "This benchmark measures live Inhibitor API latency, successful throughput, transport reliability, response-shape anomalies, configured workload expectations, behavior across the configured concurrency stages, and short-window recovery behavior.",
    "It does not measure sustained-load endurance, soak behavior, production autoscaling, disaster recovery, semantic correctness of observations or predictions, human-label agreement, full agent trajectory overhead, sandbox enforcement, controller enforcement, or whether an unsafe action was prevented.",
    "It does not compare simulated client or agent behavior with Inhibitor versus without Inhibitor.",
    "Recovery probes are lightweight diagnostics and do not constitute disaster-recovery or production resilience certification.",
    "The timing values, concurrency levels, and recovery threshold are benchmark protocol choices, not universal service-level objectives.",
]


def render_benchmark_report(
    *,
    manifest: dict[str, Any],
    scenario_manifest: dict[str, Any],
    per_trial: pd.DataFrame,
    cross_trial: pd.DataFrame,
    scored: pd.DataFrame,
    recovery: pd.DataFrame,
    anomaly_summary: pd.DataFrame,
    anomaly_breakdown: pd.DataFrame,
    findings: list[str],
    plot_paths: list[Path],
    artifact_names: list[str],
) -> str:
    """Render an executive-readable report from deterministic benchmark evidence."""
    # Derive headline metrics exclusively from scored traffic, excluding recovery diagnostics.
    attempted = len(scored)
    successes = (
        int(scored["success"].fillna(False).sum())
        if not scored.empty
        else 0
    )
    success_rate_text = (
        f"{successes / attempted:.2%}"
        if attempted
        else "not evaluable"
    )
    anomalies = int(
        anomaly_summary.get(
            "anomalous_responses",
            pd.Series(dtype=int),
        ).sum()
    )

    # Distinguish absent evidence from a partially completed protocol in the report narrative.
    if attempted == 0:
        incomplete_run_note = (
            "This run contains no completed request records. "
            "Execution ended before the first request checkpoint "
            "was populated."
        )
    elif manifest.get("benchmark_status") in {
        "incomplete",
        "failed",
        "running",
    }:
        incomplete_run_note = (
            "This report was generated from an incomplete benchmark run. "
            "Available request evidence is preserved, but the configured "
            "protocol did not complete."
        )
    else:
        incomplete_run_note = ""

    # Render workload provenance from the canonical scenario manifest rather than request rows.
    scenario_frame = pd.DataFrame(
        scenario_manifest["scenarios"]
    )
    scenario_table = _markdown_table(
        scenario_frame,
        [
            "scenario_id",
            "title",
            "expected_class",
            "message_count",
            "character_count",
            "word_count",
            "estimated_input_tokens",
            "expected_min_observations",
            "expected_min_predictions",
        ],
        {
            "scenario_id": "Scenario",
            "expected_class": "Classification",
            "message_count": "Messages",
            "character_count": "Characters",
            "word_count": "Words",
            "estimated_input_tokens": "Approx. input tokens",
            "expected_min_observations": "Minimum observations",
            "expected_min_predictions": "Minimum predictions",
        },
    )

    # Discover chart sections only from paths generated for this deterministic reporting pass.
    charts = _build_chart_markdown(
        plot_paths,
        scored,
    )

    # Collapse recorded trial outcomes into a stable executive-summary status.
    recovery_statuses = (
        ", ".join(
            sorted(
                set(
                    recovery.get(
                        "recovery_probe_status",
                        pd.Series(dtype=str),
                    )
                    .dropna()
                    .astype(str)
                )
            )
        )
        or "not evaluable"
    )

    # Limit executive tables to the established reporting columns and human-readable headings.
    per_trial_table = _markdown_table(
        per_trial,
        [
            "trial_number",
            "concurrency_level",
            "mode",
            "attempt_count",
            "success_count",
            "success_rate",
            "p50_latency_ms",
            "p95_latency_ms",
            "p99_latency_ms",
            "successful_throughput_rps",
            "anomalous_response_count",
        ],
        {
            "attempt_count": "Attempted requests",
            "success_count": "Successful API responses",
            "success_rate": "Transport success rate",
            "p50_latency_ms": "Median latency (ms)",
            "p95_latency_ms": "95th-percentile latency (ms)",
            "p99_latency_ms": "99th-percentile latency (ms)",
            "successful_throughput_rps": (
                "Successful throughput (req/s)"
            ),
            "anomalous_response_count": (
                "Responses with anomalies"
            ),
        },
    )

    cross_table = _markdown_table(
        cross_trial,
        [
            "concurrency_level",
            "mode",
            "trial_count",
            "success_rate_median",
            "p50_latency_ms_median",
            "p95_latency_ms_median",
            "p99_latency_ms_median",
            "successful_throughput_rps_median",
        ],
        {
            "trial_count": "Contributing trials",
            "success_rate_median": (
                "Median transport success rate"
            ),
            "p50_latency_ms_median": (
                "Median p50 latency (ms)"
            ),
            "p95_latency_ms_median": (
                "Median p95 latency (ms)"
            ),
            "p99_latency_ms_median": (
                "Median p99 latency (ms)"
            ),
            "successful_throughput_rps_median": (
                "Median successful throughput (req/s)"
            ),
        },
    )

    # Classify transport failures only within scored requests; probes are reported separately.
    failures = (
        scored[scored["success"].eq(False)]
        if not scored.empty
        else scored
    )
    failure_summary = (
        failures.groupby(
            ["failure_category"],
            dropna=False,
        )
        .size()
        .reset_index(name="count")
        if not failures.empty
        else pd.DataFrame()
    )

    # Empty failure evidence represents zero observed failures, not missing data.
    failure_table = (
        "No transport or API-response failures were recorded among scored requests."
        if failures.empty
        else _markdown_table(
            failure_summary,
            ["failure_category", "count"],
            {
                "failure_category": "Transport failure category",
                "count": "Count",
            },
        )
    )

    # Render different audit guidance depending on whether structural anomalies exist.
    if anomalies == 0:
        anomaly_text = (
            "No configured response anomalies were detected among "
            "transport-successful scored responses."
        )
        anomaly_follow_up = (
            "No anomaly-specific follow-up is required for this run."
        )
    else:
        anomaly_text = (
            f"{anomalies} transport-successful scored responses "
            "contained configured anomalies. Request identifiers "
            "are retained in request_records.jsonl for audit."
        )
        anomaly_follow_up = (
            "Affected request identifiers and complete machine-readable "
            "responses are retained in request_records.jsonl for "
            "investigation."
        )

        if not anomaly_breakdown.empty:
            anomaly_text += (
                "\n\n"
                + anomaly_breakdown.to_markdown(index=False)
            )

    # Treat a single trial as descriptive evidence, not repeatability, capacity, or resilience proof.
    configured_trials = int(
        manifest["configured_trials"]
    )
    smoke_test_boundary = (
        (
            "This run contains one contributing trial. The results are "
            "descriptive and validate the benchmark workflow, but they "
            "do not establish repeated-run reliability or production "
            "capacity."
        )
        if configured_trials == 1
        else (
            "Cross-trial medians and ranges are computed from "
            "equal-weight per-trial rows."
        )
    )

    recovery_ratio_summary = _build_recovery_ratio_summary(
        recovery
    )

    # Interpret recovery conditionally so failed runs are not described as passing.
    recovery_interpretation = _build_recovery_interpretation(
        recovery
    )

    # Disclose when the recovery reference is based on a single request.
    recovery_baseline_note = _build_recovery_baseline_note(
        per_trial
    )

    # Interpolate computed evidence into the fixed Markdown template for deterministic regeneration.
    return f"""# Inhibitor Operational Benchmark Report

## 1. Executive summary

The live Inhibitor `/check` API version
**{manifest.get('target_inhibitor_version', 'not reported')}**
was evaluated with a configurable progressive burst-concurrency protocol
using paired Insight and Performance requests.

### Run outcome

- **Protocol status:** {manifest.get('benchmark_status', 'unknown')}
- **Inhibitor version tested:** {manifest.get('target_inhibitor_version', 'not reported')}
- **Configured trials:** {manifest['configured_trials']}
- **Tested concurrency:** {manifest['configured_concurrency_levels']}
- **Scored requests:** {successes} successful of {attempted} attempted ({success_rate_text})
- **Configured response anomalies:** {anomalies}
- **Recovery probe:** {recovery_statuses}

{incomplete_run_note}

### Interpretation

{smoke_test_boundary}

The observed results support statements about transport reliability,
response-shape consistency, measured latency and throughput, and
short-window post-burst responsiveness under this protocol. They do not
establish the service's maximum sustainable capacity or a production
service-level objective.

### Deterministic findings

{chr(10).join('- ' + item for item in findings)}

No infrastructure prescription is inferred directly from these
measurements.

## 2. What this run supports

This benchmark provides evidence about:

- successful-response latency distributions;
- successful and attempted throughput;
- transport and API-response reliability;
- configured response-shape anomalies;
- behavior across the configured concurrency stages; and
- short-window post-burst recovery behavior.

Operational pressure is not treated automatically as a safety failure.
Higher latency, reduced throughput, timeouts, or transport errors are
operational-capacity and reliability evidence. They can motivate
engineering controls such as queueing, backpressure, autoscaling,
circuit breakers, or risk-aware degraded operation, but those controls
are not evaluated directly by this run.

## 3. Benchmark scope and workload

This is a live `/check` progressive burst-concurrency benchmark with
configurable trials and stages, paired Insight and Performance requests,
a short-context operational workload, and lightweight recovery probes.
It is not a sustained or steady-state capacity test.

### Workload definition

{scenario_table}

Approximate input-token counts use the benchmark's character-based
estimation method and are not exact tokenizer measurements. Scenario
expectations are configured minimum shape checks, not semantic-correctness
labels.

For every scored stage:
`total planned requests = simulated users × configured modes × mode-pair repeats per user`.

Each user sends {manifest['mode_pair_repeats_per_user']} complete paired
cycle(s), or {len(manifest['modes']) * manifest['mode_pair_repeats_per_user']}
requests per user.

## 4. Operational evaluation rationale

The appliedAIstudio Inhibitor evaluation framework treats operational
reliability as a first-class evaluation dimension rather than evaluating
the Inhibitor only as a classifier. The framework calls for reporting
latency distributions, throughput, timeout and error behavior,
output-consistency anomalies, and reliability under concurrency and
failure pressure.

This benchmark operationalizes that framework through progressive burst
concurrency, explicit separation of successful and failed outcomes,
response-integrity checks, repeatable trials, and a lightweight
post-burst recovery probe.

The framework supports measuring operational reliability and degraded or
post-pressure behavior. The exact cooldown durations, recovery timing,
concurrency levels, and 2× latency comparison used here are explicit
benchmark protocol choices, not universal thresholds.

## 5. Protocol and timing controls

### Configured protocol

- Configured trials: {manifest['configured_trials']}
- Concurrency sequence: {manifest['configured_concurrency_levels']}
- Scored stages per trial: {manifest['scored_stages_per_trial']}
- Stage cooldown: {manifest['stage_cooldown_seconds']} seconds
- Trial recovery window: {manifest['trial_cooldown_seconds']} seconds
- Recovery probe timing: {manifest['recovery_probe_at_seconds']} seconds after the final scored stage
- Recovery scenario: Example 6
- Recovery rule: both modes must succeed without a configured anomaly and each latency must be no more than 2× its same-trial concurrency-1 p50 baseline.

### Inter-stage cooldown

A fixed pause separates consecutive scored concurrency stages. Its
purpose is to reduce direct overlap and immediate carryover between burst
levels, including requests still completing and short-lived queue,
connection, or upstream-provider pressure.

The cooldown does not prove that every internal or upstream component
returned to a fully idle condition.

### Post-burst recovery probe

A lightweight paired-mode probe is sent
{manifest['recovery_probe_at_seconds']} seconds after the final scored
burst. It evaluates whether the service can again:

1. complete both requests successfully;
2. return responses without configured structural anomalies; and
3. remain within the configured mode-specific latency rule.

Each recovery latency is compared with the same mode's concurrency-1 p50
latency from the same trial. This provides a local reference that accounts
for the substantial latency difference between Insight and Performance
modes and some run-to-run environmental variation.

### Remaining trial cooldown

After the recovery probe, the benchmark waits for the remainder of the
{manifest['trial_cooldown_seconds']}-second trial window. This reduces
direct temporal dependence between repeated trials and improves
comparability, but it does not guarantee statistical independence.

### Interpretation boundary

Together, these controls provide evidence about short-window post-burst
responsiveness under this protocol. They do not establish sustained-load
capacity, production autoscaling, disaster recovery, complete queue
drainage, or restoration of every internal and upstream system component.

## 6. Results

### Per-trial summary

{per_trial_table}

### Cross-trial summary

{cross_table}

{smoke_test_boundary}

### Transport failures

This summary groups unsuccessful scored requests by operational failure
category, including HTTP 4xx responses, HTTP 5xx responses, timeouts,
API-declared errors, malformed JSON, and client-side exceptions.

{failure_table}

{
    "No failure-specific chart was generated because no scored request "
    "failed during this run."
    if failures.empty
    else
    "Failure-specific request evidence is retained in request_records.jsonl "
    "and summarized by category above."
}

### Anomaly summary

This summary counts transport-successful scored responses that violated
configured structural expectations. Examples include missing required
observations, missing required predictions, or other configured
response-shape inconsistencies. It does not evaluate semantic correctness.

{anomaly_summary.to_markdown(index=False) if not anomaly_summary.empty else '_No scored rows were available for anomaly evaluation._'}

### Recovery summary

This summary records one post-burst diagnostic result per trial. For each
mode, it captures transport success, configured anomaly status, observed
recovery latency, the same-trial concurrency-1 p50 baseline, the configured
2× latency limit, and the final recovery decision.

Recovery requests are diagnostic evidence and are excluded from scored
latency, throughput, transport-success, and anomaly metrics.

{recovery.to_markdown(index=False) if not recovery.empty else '_Recovery evidence is unavailable._'}


No formal acceptance threshold was configured for latency, throughput,
transport success, or anomaly rate.

## 7. Charts and interpretation

{charts}

For a single-trial run or a group with few observations, percentile and
distribution views are descriptive rather than stable capacity estimates.

## 8. Recovery assessment

The recovery result for this run was **{recovery_statuses}**.

Under the configured recovery rule, a passed result requires both modes to:

1. complete successfully;
2. return no configured response-shape anomaly; and
3. complete within twice their respective same-trial concurrency-1
   p50 latency baselines.

{recovery_ratio_summary}

{recovery_baseline_note}

{recovery_interpretation}

Recovery requests are excluded from all scored summaries.

## 9. Response anomalies

{anomaly_text}

{anomaly_follow_up}

## 10. Limitations and claim boundaries

{chr(10).join('- ' + boundary for boundary in CLAIM_BOUNDARIES)}

## 11. Evidence artifacts

{chr(10).join('- `' + name + '`' for name in artifact_names)}

The canonical request-level evidence is preserved in
`request_records.jsonl`. The scored-only and recovery-only JSONL files are
convenience subsets for manual inspection and downstream analysis. CSV
files provide flattened views, manifests record workload and run
provenance, and summaries and plots provide deterministic reporting views.

"""

def checkpoint_dataframe_csv(path: Path, frame: pd.DataFrame) -> None:
    """Atomically replace checkpoint metadata used to audit partial live runs."""
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    frame.to_csv(temporary_path, index=False)
    temporary_path.replace(path)


def write_raw_evidence_artifacts(
    *, run_dir: Path, request_records: list[dict[str, Any]],
    run_manifest: dict[str, Any], stage_metadata: pd.DataFrame,
    trial_metadata: pd.DataFrame,
) -> dict[str, Path]:
    """Checkpoint mutable live evidence independently of derived reporting."""
    # Keep canonical request evidence and run provenance separate from regenerable reports.
    paths = {
        "request_records.jsonl": run_dir / "request_records.jsonl",
        "stage_metadata.csv": run_dir / "stage_metadata.csv",
        "trial_metadata.csv": run_dir / "trial_metadata.csv",
        "run_manifest.json": run_dir / "run_manifest.json",
    }
    checkpoint_jsonl(paths["request_records.jsonl"], request_records)
    checkpoint_dataframe_csv(paths["stage_metadata.csv"], stage_metadata)
    checkpoint_dataframe_csv(paths["trial_metadata.csv"], trial_metadata)
    checkpoint_json(paths["run_manifest.json"], run_manifest)
    return paths


def write_derived_reporting_artifacts(
    *, run_dir: Path, requests: pd.DataFrame, scored: pd.DataFrame,
    recovery_requests: pd.DataFrame, per_trial: pd.DataFrame,
    cross_trial: pd.DataFrame, recovery_summary: pd.DataFrame,
    anomaly_summary: pd.DataFrame, anomaly_breakdown: pd.DataFrame,
    report: str, report_manifest: dict[str, Any], write_raw_splits: bool,
) -> dict[str, Path]:
    """Replace regenerable outputs without touching canonical reload artifacts."""
    # Use the fixed artifact inventory so repeated reporting writes the same derived filenames.
    paths = {name: run_dir / name for name in [
        "request_records.csv", "scored_request_records.jsonl",
        "recovery_request_records.jsonl", "per_trial_summary.csv",
        "cross_trial_summary.csv", "recovery_summary.csv", "anomaly_summary.csv",
        "anomaly_breakdown.csv", "benchmark_report.md", "report_manifest.json",
    ]}
    # Export a flattened convenience view without replacing canonical request_records.jsonl.
    flatten_dataframe_for_csv(requests).to_csv(paths["request_records.csv"], index=False)

    # Write scored-only and recovery-only JSONL as convenience subsets, never canonical evidence.
    if write_raw_splits:
        write_jsonl(paths["scored_request_records.jsonl"], scored.to_dict("records"))
        write_jsonl(paths["recovery_request_records.jsonl"], recovery_requests.to_dict("records"))
    # Export summaries as derived tables that can be rebuilt from the saved canonical artifacts.
    for name, frame in [
        ("per_trial_summary.csv", per_trial), ("cross_trial_summary.csv", cross_trial),
        ("recovery_summary.csv", recovery_summary), ("anomaly_summary.csv", anomaly_summary),
        ("anomaly_breakdown.csv", anomaly_breakdown),
    ]:
        frame.to_csv(paths[name], index=False)
    # Persist the rendered report and its manifest as deterministic derived artifacts.
    paths["benchmark_report.md"].write_text(report, encoding="utf-8")
    write_json(paths["report_manifest.json"], report_manifest)
    return paths
