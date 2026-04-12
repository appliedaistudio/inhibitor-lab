#!/bin/bash
# Launch 9 parallel SLURM GPU jobs for 5-month exponential-decay backfill.
# One job per feed for maximum speed. Retry logic in the script handles 429s.

set -e

SLURM_SCRIPT="backfill_single_feed.slurm"
DAY_LIST="backfill_days.txt"

echo "=== Generating exponential decay day list ==="
python3 generate_day_list.py -o "${DAY_LIST}"
echo ""

FEEDS=(
    "4603:PPD-Citywide"
    "17310:PPD-Central"
    "21297:PPD-East"
    "45495:PPD-Northeast"
    "18836:PPD-Northwest"
    "15102:PPD-South"
    "15195:PPD-SW-West"
    "34250:PFD-SouthFire"
    "15747:PFD-NorthFire"
)

echo "=== Submitting ${#FEEDS[@]} SLURM jobs (1 per feed, max speed) ==="
echo ""

JOB_IDS=()

for i in "${!FEEDS[@]}"; do
    IFS=':' read -r fid label <<< "${FEEDS[$i]}"

    JID=$(sbatch \
        --job-name="pp-${label}" \
        --export="FEEDS=${fid},DAY_LIST=${DAY_LIST}" \
        "$SLURM_SCRIPT" | awk '{print $NF}')

    echo "  Job $JID: ${label} (feed ${fid})"
    JOB_IDS+=("$JID")

    # Short stagger to avoid simultaneous Broadcastify logins
    if [ "$i" -lt $(( ${#FEEDS[@]} - 1 )) ]; then
        sleep 15
    fi
done

echo ""
echo "=== All ${#JOB_IDS[@]} jobs submitted ==="
echo "Job IDs: ${JOB_IDS[*]}"
echo ""
echo "Day list: $(wc -l < ${DAY_LIST}) dates in ${DAY_LIST}"
echo ""
echo "Monitor:"
echo "  squeue -u \$USER"
echo "  tail -f backfill_<JOBID>.log"
echo "  ls -la backfill_progress/"
