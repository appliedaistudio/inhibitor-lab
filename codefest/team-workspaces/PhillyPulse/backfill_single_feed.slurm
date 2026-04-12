#!/bin/bash
#SBATCH --job-name=pp-backfill
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G
#SBATCH --time=48:00:00
#SBATCH --output=backfill_%j.log
#SBATCH --error=backfill_%j.err

module load cuda/12.6-0

cd ~/PhillyPulse
source venv/bin/activate

echo "=== PhillyPulse GPU Backfill ==="
echo "Feeds: ${FEEDS}"
echo "Day list: ${DAY_LIST}"
echo "Node: $(hostname)"
echo "GPU:"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
echo "Start: $(date)"
echo ""

IFS=',' read -ra FEED_ARRAY <<< "${FEEDS}"
for fid in "${FEED_ARRAY[@]}"; do
    echo "--- Starting feed ${fid} at $(date) ---"
    python3 backfill_archives.py --day-list "${DAY_LIST}" --feed "${fid}"
    echo "--- Finished feed ${fid} at $(date) ---"
    echo ""
done

echo "=== All feeds done: $(date) ==="
