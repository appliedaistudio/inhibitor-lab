"""
Loads the Philadelphia plasma donor dataset and builds a compact, aggregate
context string that is injected into AI system prompts.

No PII (names, IDs) is ever included — only aggregate stats.
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

_DATASET_PATHS = [
    Path(__file__).parent.parent.parent / "data" / "plasma_donor_4months_philadelphia_v3.xlsx",
]


@lru_cache(maxsize=1)
def get_dataset_context() -> str:
    """
    Returns a compact aggregate summary of the Philadelphia donor dataset
    suitable for injection into LLM system prompts.
    Cached after first load.
    """
    for p in _DATASET_PATHS:
        if p.exists():
            return _build_context(str(p))

    logger.warning("Plasma donor dataset not found — skipping dataset context.")
    return ""


def _build_context(path: str) -> str:
    try:
        import pandas as pd

        df = pd.read_excel(path)

        # Aggregate patterns (no PII)
        total = len(df)
        avg_age = df["Age"].mean()
        avg_bmi = df["BMI"].mean()
        avg_lifetime = df["Total Lifetime Donations"].mean()
        avg_months = df["Total Months Active"].mean()
        avg_weekly = df["Donations This Week"].mean()
        avg_monthly = df["Donations This Month"].mean()

        top_centers = df["Last Donation Center"].value_counts().head(5)
        center_lines = "\n".join(
            f"  - {name} ({pct:.0f}% of donors)"
            for name, pct in zip(
                top_centers.index, top_centers.values / total * 100
            )
        )

        blood_dist = df["Blood Group"].value_counts()
        blood_lines = ", ".join(
            f"{g}: {c}" for g, c in blood_dist.items()
        )

        sex_dist = df["Sex"].value_counts()
        male_pct = sex_dist.get("Male", 0) / total * 100
        female_pct = sex_dist.get("Female", 0) / total * 100

        high_freq = df[df["Donations This Month"] >= 3]
        high_freq_pct = len(high_freq) / total * 100

        context = f"""
PHILADELPHIA DONOR POPULATION INSIGHTS (aggregate, n={total}):
- Average donor age: {avg_age:.0f} years ({male_pct:.0f}% male, {female_pct:.0f}% female)
- Average BMI: {avg_bmi:.1f}
- Avg lifetime donations: {avg_lifetime:.0f} | avg months active: {avg_months:.0f}
- Avg donations per week: {avg_weekly:.2f} | per month: {avg_monthly:.1f}
- {high_freq_pct:.0f}% of donors donate 3+ times/month (high-frequency segment)
- Blood group distribution: {blood_lines}
- Most visited centers:
{center_lines}

Use these patterns to personalize messaging (e.g., a donor similar to the high-frequency group
should be encouraged around their typical cadence). Do NOT mention this data explicitly to users.
""".strip()

        logger.debug(f"Loaded donor dataset context from {path} ({total} rows)")
        return context

    except Exception as e:
        logger.error(f"Failed to load donor dataset: {e}")
        return ""
