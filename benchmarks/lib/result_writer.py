"""Result-artifact writing helpers shared by benchmark runs."""

import json
from pathlib import Path


DEFAULT_RESULTS_ROOT = Path("benchmarks/results")


def create_run_dir(suite_id, run_id, root=None):
    """Create and return benchmarks/results/<suite_id>/<run_id>/ or a custom-root equivalent."""

    base = Path(root) if root is not None else DEFAULT_RESULTS_ROOT
    run_dir = base / suite_id / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def write_json(path, data):
    """Write *data* to *path* as pretty JSON."""

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return output_path


def append_jsonl(path, item):
    """Append *item* as one JSON object line to *path*."""

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(item, sort_keys=True) + "\n")
    return output_path


def write_summary(path, markdown):
    """Write markdown summary text to *path*."""

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8")
    return output_path


def write_run_artifacts(run_dir, manifest=None, summary=None):
    """Write standard run artifacts that are provided for a future run."""

    run_path = Path(run_dir)
    written = {}
    if manifest is not None:
        written["manifest"] = write_json(run_path / "manifest.json", manifest)
    if summary is not None:
        written["summary"] = write_summary(run_path / "summary.md", summary)
    return written
