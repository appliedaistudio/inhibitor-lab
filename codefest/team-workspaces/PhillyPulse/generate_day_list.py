"""Generate an exponential-decay day list for backfill.

Recent dates are sampled densely, older dates are sampled sparsely.

Window          Range             Sampling         ~Days
Recent          1-14 days ago     Every day        14
Medium          15-30 days ago    Every other day  8
Older           31-60 days ago    Every 3rd day    10
Historical      61-150 days ago   Every 5th day    18
                                                   ----
                                            Total: ~50

Usage:
    python generate_day_list.py                # prints to stdout
    python generate_day_list.py -o days.txt    # writes to file
"""

from __future__ import annotations

import argparse
import datetime


def exponential_decay_dates(total_days: int = 150) -> list[str]:
    today = datetime.date.today()
    dates: list[str] = []

    for d in range(1, min(total_days, 14) + 1):
        dates.append((today - datetime.timedelta(days=d)).isoformat())

    for d in range(15, min(total_days, 30) + 1, 2):
        dates.append((today - datetime.timedelta(days=d)).isoformat())

    for d in range(31, min(total_days, 60) + 1, 3):
        dates.append((today - datetime.timedelta(days=d)).isoformat())

    for d in range(61, min(total_days, 150) + 1, 5):
        dates.append((today - datetime.timedelta(days=d)).isoformat())

    return dates


def main():
    parser = argparse.ArgumentParser(description="Generate exponential-decay day list")
    parser.add_argument("-o", "--output", type=str, default=None, help="Output file (default: stdout)")
    parser.add_argument("--days", type=int, default=150, help="Max days back (default: 150)")
    args = parser.parse_args()

    dates = exponential_decay_dates(args.days)

    header = f"# Exponential decay day list: {len(dates)} dates over {args.days} days"
    lines = [header] + dates

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"Wrote {len(dates)} dates to {args.output}")
    else:
        for line in lines:
            print(line)


if __name__ == "__main__":
    main()
