# Adaptive Feedback Agent – Feedback & Thresholds (v1.4)

**Goal:** Adjust model parameters based on outcomes.

## Feedback Signals
- True positives (TP) and false positives (FP) must be tracked per category: hate, sexual content, PII.
- If FP rate for a category exceeds 5% over the last 500 labeled items, lower that category's sensitivity by one step.
- If FN rate exceeds 3% for a category over the last 500, raise sensitivity by one step.
- If there are fewer than 100 labeled items in window, do not update sensitivity.

## Rate & Safety Limits
- Sensitivity adjustments must be at most once per 15 minutes per category.
- Do not adjust more than ±2 steps within a 24-hour period.
- If any category is set to max sensitivity for 24 hours, require human review before further increases.

## Audit & Traceability
- Record (timestamp, category, old_sensitivity, new_sensitivity, reason).
- Store reviewer ID when human review occurs.
