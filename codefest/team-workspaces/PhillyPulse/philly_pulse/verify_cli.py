#!/usr/bin/env python3
"""
PhillyPulse verification CLI — human review + automatic consistency checks.

Human: incident_human_review (interactive review).
Auto: incident_auto_check — rules (YAML s_base, confidence, geocode, keyword/category
heuristics) and optional OpenAI cross-check (--llm).

Usage:
  python -m philly_pulse.verify_cli stats
  python -m philly_pulse.verify_cli autocheck
  python -m philly_pulse.verify_cli autocheck --all --limit 100 --llm
  python -m philly_pulse.verify_cli autocheck --export auto.json
  python -m philly_pulse.verify_cli list / show / review / export ...

Environment:
  PHILLY_PULSE_DB   SQLite path
  OPENAI_API_KEY    Optional; enables --llm on autocheck
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import textwrap
from pathlib import Path
from typing import Any

import yaml

from philly_pulse import auto_verify, store

YAML_PATH = Path(__file__).resolve().parent / "data" / "severity_categories.yaml"

VERDICTS = (
    "accurate",
    "wrong_category",
    "false_alarm",
    "uncertain",
    "skip",
)


def load_category_help() -> dict[str, dict[str, Any]]:
    with open(YAML_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return dict(data.get("categories") or {})


def _prompt_ynu(label: str) -> int | None:
    """Return 1 yes, 0 no, None skip/unknown."""
    while True:
        s = input(f"{label} [y/n/?]: ").strip().lower()
        if s in ("y", "yes"):
            return 1
        if s in ("n", "no"):
            return 0
        if s in ("?", "", "u", "unk", "unknown", "s", "skip"):
            return None
        print("  Enter y, n, or ? (unknown/skip)")


def _prompt_line(label: str, optional: bool = True) -> str | None:
    s = input(label + ("" if optional else " (required): ")).strip()
    if not s and optional:
        return None
    return s or None


def _pick_category(categories: dict[str, dict[str, Any]], current: str) -> str | None:
    keys = sorted(categories.keys())
    print("\nSeverity categories (pick number or Enter to keep current):")
    for i, k in enumerate(keys, 1):
        desc = categories[k].get("description", "")
        mark = " ← current" if k == current else ""
        print(f"  {i:2}. {k}{mark}")
        if desc:
            for line in textwrap.wrap(desc, width=72, initial_indent="      ", subsequent_indent="      "):
                print(line)
    while True:
        raw = input(f"Correct category [1-{len(keys)} or Enter='{current}']: ").strip()
        if not raw:
            return current
        if raw.isdigit():
            idx = int(raw)
            if 1 <= idx <= len(keys):
                return keys[idx - 1]
        if raw in categories:
            return raw
        print("  Invalid choice.")


def _print_incident(inc: dict[str, Any], categories: dict[str, dict[str, Any]]) -> None:
    w = 78
    bar = "═" * w
    print(f"\n┌{bar}┐")
    print(f"│ ID: {inc['id']:<{w - 5}}│")
    print(f"│ Reported: {str(inc.get('reported_at', ''))[:70]:<{w - 12}}│")
    print(f"└{bar}┘")

    print("\n── RAW TEXT (from audio / pipeline) ──")
    for line in textwrap.wrap(inc.get("raw_text") or "", width=w, replace_whitespace=False):
        print(f"  {line}")

    cat = inc.get("severity_category", "")
    print("\n── ASSIGNED CATEGORY ──")
    print(f"  {cat}")
    if cat in categories:
        print(f"  Definition: {categories[cat].get('description', '')}")

    print("\n── LOCATION ──")
    print(f"  Text: {inc.get('location_text')}")
    print(f"  Geocode: {inc.get('geocode_status')}  lat={inc.get('lat')} lng={inc.get('lng')}")

    print("\n── SCORES / GUARDRAILS ──")
    print(f"  s_base: {inc.get('s_base')}   confidence: {inc.get('confidence')}")
    print(f"  inhibitor: {inc.get('inhibitor_status')}  {inc.get('inhibitor_reason') or ''}")

    existing = store.get_human_review(inc["id"])
    if existing:
        print("\n── EXISTING HUMAN REVIEW ──")
        for k in ("verdict", "transcript_accurate", "category_accurate", "location_accurate", "corrected_category", "notes", "reviewed_at"):
            print(f"  {k}: {existing.get(k)}")
    auto = store.get_auto_check(inc["id"])
    if auto:
        print("\n── AUTO CHECK (latest) ──")
        print(f"  status: {auto.get('auto_status')}  score: {auto.get('auto_score')}  engine: {auto.get('engine_version')}")
        try:
            flags = json.loads(auto.get("flags_json") or "[]")
            for f in flags:
                print(f"    [{f.get('severity')}] {f.get('id')}: {f.get('message')}")
        except json.JSONDecodeError:
            pass
        if auto.get("llm_agrees"):
            print(f"  LLM: {auto.get('llm_agrees')}  suggested={auto.get('llm_suggested_category')}")
            if auto.get("llm_reason"):
                print(f"       {auto.get('llm_reason')}")


def cmd_stats() -> int:
    c = store.human_review_counts()
    print("PhillyPulse human verification stats")
    print(f"  Incidents in DB:     {c['incidents_total']}")
    print(f"  Human reviewed:      {c['reviewed']}")
    print(f"  Human pending:       {c['pending']}")
    if c["by_verdict"]:
        print("  Human verdicts:")
        for v, n in sorted(c["by_verdict"].items(), key=lambda x: -x[1]):
            print(f"    {v}: {n}")
    ac = store.auto_check_stats()
    print("\nAuto-check (rules + optional LLM)")
    print(f"  Auto-checked rows:   {ac['auto_checked']}")
    if ac["by_status"]:
        for s, n in sorted(ac["by_status"].items(), key=lambda x: -x[1]):
            print(f"    {s}: {n}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    if args.all:
        rows = store.list_recent_incidents_with_review(limit=args.limit)
        print(f"{'ID':<14} {'VERDICT':<16} {'CATEGORY':<22} {'LOCATION (trunc)':<30}")
        print("-" * 82)
        for r in rows:
            loc = (r.get("location_text") or "")[:28]
            v = r.get("human_verdict") or "—"
            print(f"{r['id']:<14} {v:<16} {(r.get('severity_category') or '')[:20]:<22} {loc:<30}")
    else:
        rows = store.list_incidents_pending_human_review(
            limit=args.limit, include_blocked=args.include_blocked
        )
        print(f"Pending human review ({len(rows)} shown, limit {args.limit}):")
        for r in rows:
            loc = (r.get("location_text") or "")[:40]
            print(f"  {r['id']}  {r.get('severity_category')}  {loc}")
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    categories = load_category_help()
    inc = store.get_incident(args.incident_id)
    if not inc:
        print(f"Unknown incident id: {args.incident_id}", file=sys.stderr)
        return 1
    _print_incident(inc, categories)
    return 0


def _run_review_session(inc: dict[str, Any], categories: dict[str, dict[str, Any]]) -> bool:
    """Interactive questions; returns True if saved."""
    _print_incident(inc, categories)
    print("\n── QUESTIONS (compare transcript to audio if you have it) ──")
    print("Verdict hints: accurate = looks right; wrong_category = text ok, label wrong;")
    print("false_alarm = not a real dispatch / hallucination / should not be on map; uncertain = can't tell; skip = defer.\n")

    event_real = _prompt_ynu("Believable real scanner event (not obvious fiction/hallucination)?")
    transcript_ok = _prompt_ynu("Does the stored raw_text match what was said (content faithful)?")
    category_ok = _prompt_ynu("Is severity_category appropriate for the text?")
    location_ok = _prompt_ynu("Is location_text / geocode plausible for the text?")

    corrected = None
    if category_ok == 0:
        corrected = _pick_category(categories, inc.get("severity_category") or "")

    print("\nSuggested verdict:")
    if event_real == 0:
        sug = "false_alarm"
    elif category_ok == 0:
        sug = "wrong_category"
    elif transcript_ok == 1 and category_ok == 1 and (location_ok == 1 or location_ok is None):
        sug = "accurate"
    elif transcript_ok is None and category_ok is None:
        sug = "skip"
    else:
        sug = "uncertain"
    print(f"  → {sug}")

    vraw = _prompt_line(f"Final verdict {VERDICTS} [{sug}]: ", optional=True)
    verdict = vraw if vraw in VERDICTS else sug

    notes = _prompt_line("Notes (optional): ", optional=True)

    store.save_human_review(
        incident_id=inc["id"],
        verdict=verdict,
        transcript_accurate=transcript_ok,
        category_accurate=category_ok,
        location_accurate=location_ok,
        corrected_category=corrected if category_ok == 0 else None,
        notes=notes,
    )
    print(f"\nSaved review for {inc['id']} verdict={verdict}\n")
    return True


def cmd_review(args: argparse.Namespace) -> int:
    categories = load_category_help()
    store.ensure_human_review_table()

    if args.incident_id:
        inc = store.get_incident(args.incident_id)
        if not inc:
            print(f"Unknown id: {args.incident_id}", file=sys.stderr)
            return 1
        _run_review_session(inc, categories)
        return 0

    pending = store.list_incidents_pending_human_review(
        limit=args.limit, include_blocked=args.include_blocked
    )
    if not pending:
        print("No pending incidents to review.")
        return 0

    print(f"Review queue: {len(pending)} incidents. Ctrl+C to exit.\n")
    for inc in pending:
        try:
            cont = input(f"Review {inc['id']}? [Y/n/q quit]: ").strip().lower()
            if cont in ("q", "quit", "exit"):
                break
            if cont in ("n", "no", "s", "skip"):
                continue
            _run_review_session(inc, categories)
        except KeyboardInterrupt:
            print("\nStopped.")
            break
    return 0


def cmd_autocheck(args: argparse.Namespace) -> int:
    store.ensure_auto_check_table()
    if args.pending_only:
        incidents = store.list_incidents_without_auto_check(limit=args.limit)
    else:
        incidents = store.list_incidents_recent(
            limit=args.limit, include_blocked=args.include_blocked
        )

    if not incidents:
        print("No incidents to check.")
        return 0

    print(f"Auto-checking {len(incidents)} incident(s){' with LLM' if args.llm else ''}...")
    summary = {"pass": 0, "warn": 0, "fail": 0}
    for inc in incidents:
        r = auto_verify.auto_verify_incident(inc, use_llm=args.llm)
        summary[r.auto_status] = summary.get(r.auto_status, 0) + 1
        jd = json.dumps([{"id": f.id, "severity": f.severity, "message": f.message} for f in r.flags])
        store.save_auto_check(
            incident_id=inc["id"],
            auto_status=r.auto_status,
            auto_score=r.auto_score,
            flags_json=jd,
            engine_version=r.engine_version,
            llm_agrees=r.llm_agrees,
            llm_suggested_category=r.llm_suggested_category,
            llm_reason=r.llm_reason,
        )
        if args.verbose or r.auto_status != "pass":
            print(f"  {inc['id'][:12]}  {r.auto_status:4}  score={r.auto_score}  {inc.get('severity_category')}")
            if args.verbose:
                for f in r.flags:
                    print(f"      [{f.severity}] {f.id}: {f.message}")
                if r.llm_agrees and r.llm_agrees not in ("skipped",):
                    print(f"      llm: {r.llm_agrees}  {r.llm_reason or ''}")

    print("\nSummary:", summary)
    if args.export:
        out_rows: list[dict[str, Any]] = []
        for inc in incidents:
            ac = store.get_auto_check(inc["id"])
            merged = {**inc, **(ac or {})}
            out_rows.append(merged)
        Path(args.export).write_text(json.dumps(out_rows, indent=2, default=str), encoding="utf-8")
        print(f"Wrote {len(out_rows)} row(s) to {args.export}")
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    rows = store.list_human_reviews_with_incidents(limit=args.limit)
    if args.format == "json":
        out = json.dumps(rows, indent=2, default=str)
        if args.out:
            Path(args.out).write_text(out, encoding="utf-8")
            print(f"Wrote {len(rows)} rows to {args.out}")
        else:
            print(out)
    else:
        if not rows:
            print("No reviews to export.")
            return 0
        fieldnames = list(rows[0].keys())
        if args.out:
            f = open(args.out, "w", newline="", encoding="utf-8")
        else:
            f = sys.stdout
        try:
            w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
        finally:
            if args.out:
                f.close()
                print(f"Wrote {len(rows)} rows to {args.out}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="PhillyPulse human verification tool")
    sub = p.add_subparsers(dest="cmd", required=True)

    pst = sub.add_parser("stats", help="Counts of reviewed vs pending incidents")
    pst.set_defaults(func=lambda _a: cmd_stats())

    pl = sub.add_parser("list", help="List pending or all incidents")
    pl.add_argument("--all", action="store_true", help="Show recent with review status")
    pl.add_argument("--limit", type=int, default=40)
    pl.add_argument("--include-blocked", action="store_true", help="Include inhibitor-blocked in pending queue")
    pl.set_defaults(func=cmd_list)

    ps = sub.add_parser("show", help="Print one incident for manual inspection")
    ps.add_argument("incident_id")
    ps.set_defaults(func=cmd_show)

    pr = sub.add_parser("review", help="Interactive review (queue or single id)")
    pr.add_argument("--id", dest="incident_id", default=None, metavar="ID")
    pr.add_argument("--limit", type=int, default=100)
    pr.add_argument("--include-blocked", action="store_true")
    pr.set_defaults(func=cmd_review)

    pe = sub.add_parser("export", help="Export reviews joined with incidents")
    pe.add_argument("--out", "-o", default=None, help="File path (default: stdout for JSON)")
    pe.add_argument("--format", choices=("json", "csv"), default="json")
    pe.add_argument("--limit", type=int, default=None)
    pe.set_defaults(func=cmd_export)

    pa = sub.add_parser(
        "autocheck",
        help="Run automatic rules (+ optional LLM) and save to incident_auto_check",
    )
    pa.add_argument(
        "--pending-only",
        action="store_true",
        help="Only incidents never auto-checked (default: re-check recent window)",
    )
    pa.add_argument("--limit", type=int, default=200)
    pa.add_argument(
        "--include-blocked",
        action="store_true",
        help="Include inhibitor-blocked rows when not using --pending-only",
    )
    pa.add_argument(
        "--llm",
        action="store_true",
        help="Call OpenAI for a second opinion (needs OPENAI_API_KEY; slower/cost)",
    )
    pa.add_argument("--verbose", "-v", action="store_true")
    pa.add_argument("--export", metavar="FILE", help="Write joined auto_check+incident JSON")
    pa.set_defaults(func=cmd_autocheck)

    return p


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    parser = build_parser()
    args = parser.parse_args(argv)

    db = os.environ.get("PHILLY_PULSE_DB")
    if db:
        print(f"Using DB: {db}", file=sys.stderr)

    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
