#!/usr/bin/env bash
#SBATCH --job-name=lc-random
#SBATCH --partition=standard
#SBATCH --nodes=1
#SBATCH --gres=gpu:1
#SBATCH --exclude=hai002
#SBATCH --cpus-per-task=16
#SBATCH --mem=128G
#SBATCH --time=03:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.out

set -euo pipefail
WORK=/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks
LC="$WORK/latent-commitment"
export HF_HOME="$WORK/toolchain/hf"
export PYTHONPATH="$LC"
PY="$WORK/toolchain/venv-lc/bin/python"
cd "$LC"

echo "=== random questioner, decorrelates turn from attribute ==="
"$PY" scripts/play.py --games 300 --turns 20 --temperature 0.0 --questioner random --seed 7 --tag random

echo "=== control against the random-questioner transcripts ==="
"$PY" scripts/control.py --transcripts results/transcripts_random.json --out results/control_random.json
