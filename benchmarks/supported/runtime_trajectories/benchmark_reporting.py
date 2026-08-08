#!/usr/bin/env python3
"""Regenerate a runtime-trajectory summary from preserved canonical evidence."""
import argparse
import json
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from benchmarks.supported.runtime_trajectories.src.runner import build_summary

PACKAGE_DIR = Path(__file__).resolve().parent
PRIMARY_RUN = PACKAGE_DIR / "results" / "runtime_seed_20260729_143044"


def _read_json(run_dir, name):
    return json.loads((run_dir / name).read_text(encoding="utf-8"))


def regenerate_report(run_dir=PRIMARY_RUN, output=None):
    """Rebuild summary.md using only an existing run's preserved artifacts."""
    run_dir = Path(run_dir)
    destination = Path(output) if output else run_dir / "summary.md"
    scores = _read_json(run_dir, "scores.json")
    trajectory_results = _read_json(run_dir, "trajectory_results.json")
    # scores.json is serialized with sorted keys, while live summaries preserve
    # canonical scenario order. Restore that order so regeneration is byte-stable.
    category_breakdown = scores.get("risk_category_breakdown", {})
    category_order = dict.fromkeys(
        result.get("benchmark_risk_category")
        for result in trajectory_results
        if result.get("benchmark_risk_category") in category_breakdown
    )
    scores["risk_category_breakdown"] = {
        category: category_breakdown[category] for category in category_order
    }
    summary = build_summary(
        _read_json(run_dir, "manifest.json"),
        scores,
        trajectory_results,
        _read_json(run_dir, "baseline_scores.json"),
        _read_json(run_dir, "agent_loop_scores.json"),
        _read_json(run_dir, "prompt_injection_scores.json"),
    )
    destination.write_text(summary, encoding="utf-8")
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=PRIMARY_RUN)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    print(f"Regenerated {regenerate_report(args.run_dir, args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
