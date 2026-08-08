#!/usr/bin/env python3
"""Regenerate a runtime-trajectory Markdown report from canonical run artifacts."""

import argparse
import json
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from .src.runner import build_summary
except ImportError:  # Support direct execution from the repository root.
    from benchmarks.supported.runtime_trajectories.src.runner import build_summary

PACKAGE_DIR = Path(__file__).resolve().parent
DEFAULT_RUN_DIR = PACKAGE_DIR / "results" / "runtime_seed_20260729_143044"


def _read_json(run_dir, name, required=True):
    path = run_dir / name
    if not path.exists() and not required:
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def regenerate_report(run_dir, output=None):
    """Rebuild summary.md without issuing live API requests or changing evidence."""
    run_dir = Path(run_dir)
    scores = _read_json(run_dir, "scores.json")
    trajectories = _read_json(run_dir, "trajectory_results.json")
    # Live generation preserves first-seen scenario order in this display-only mapping,
    # whereas score JSON is serialized with sorted keys. Restore that order so an
    # evidence-only regeneration is byte-for-byte reproducible.
    risk_breakdown = scores.get("risk_category_breakdown", {})
    category_order = list(dict.fromkeys(item["benchmark_risk_category"] for item in trajectories))
    scores["risk_category_breakdown"] = {
        category: risk_breakdown[category] for category in category_order if category in risk_breakdown
    }
    report = build_summary(
        _read_json(run_dir, "manifest.json"),
        scores,
        trajectories,
        _read_json(run_dir, "baseline_scores.json", required=False),
        _read_json(run_dir, "agent_loop_scores.json", required=False),
        _read_json(run_dir, "prompt_injection_scores.json", required=False),
    )
    output_path = Path(output) if output else run_dir / "summary.md"
    output_path.write_text(report, encoding="utf-8")
    return output_path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_dir", nargs="?", type=Path, default=DEFAULT_RUN_DIR)
    parser.add_argument("--output", type=Path, help="Write somewhere other than RUN_DIR/summary.md.")
    args = parser.parse_args(argv)
    print(regenerate_report(args.run_dir, args.output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
