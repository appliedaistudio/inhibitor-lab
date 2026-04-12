#!/bin/bash
# Launch 14 parallel SLURM GPU jobs for 30-day backfill.
# Each job processes one feed independently.

set -e

DAYS=30
SLURM_SCRIPT="backfill_single_feed.slurm"

FEEDS=(
    "4603:PPD-Citywide"
    "17310:PPD-Central"
    "21297:PPD-East"
    "45495:PPD-Northeast"
    "18836:PPD-Northwest"
    "15102:PPD-South"
    "15195:PPD-SouthwestWest"
    "34250:PFD-SouthFireMedics"
    "15747:PFD-NorthFire"
    "44308:SEPTA-Transit"
    "13975:SEPTA-RegionalRail"
    "13951:PA-Turnpike"
    "36323:DelCo-Police"
    "20795:Camden-FireEMS"
)

echo "=== PhillyPulse 30-Day Parallel Backfill ==="
echo "Submitting ${#FEEDS[@]} SLURM jobs, each processing $DAYS days"
echo ""

JOB_IDS=()

for entry in "${FEEDS[@]}"; do
    IFS=':' read -r feed_id label <<< "$entry"
    JOB_NAME="pp-${label}"

    JID=$(sbatch \
        --job-name="$JOB_NAME" \
        --export=FEED_ID="$feed_id",DAYS="$DAYS",FEED_LABEL="$label" \
        "$SLURM_SCRIPT" | awk '{print $NF}')

    echo "  Submitted $JOB_NAME (feed $feed_id) → Job $JID"
    JOB_IDS+=("$JID")
done

echo ""
echo "All ${#JOB_IDS[@]} jobs submitted."
echo "Job IDs: ${JOB_IDS[*]}"
echo ""
echo "Monitor with: squeue -u \$USER"
echo "View logs:    tail -f backfill_<JOBID>.log"
