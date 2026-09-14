#!/usr/bin/env bash
#SBATCH --job-name=lc-subset
#SBATCH --partition=standard
#SBATCH --nodes=1
#SBATCH --gres=gpu:1
#SBATCH --exclude=hai002
#SBATCH --cpus-per-task=16
#SBATCH --mem=128G
#SBATCH --time=05:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.out

set -euo pipefail
WORK=/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks
LC="$WORK/latent-commitment"
export HF_HOME="$WORK/toolchain/hf"
export PYTHONPATH="$LC"
PY="$WORK/toolchain/venv-lc/bin/python"
cd "$LC"

echo "=== games with 10-animal random subsets ==="
"$PY" scripts/play.py --games 300 --turns 12 --temperature 0.0 --subset-size 10 --tag subset10

echo "=== control on subset games ==="
"$PY" scripts/control.py --transcripts results/transcripts_subset10.json --out results/control_subset10.json

echo "=== probe with matched subsets ==="
"$PY" scripts/probe.py --samples 3000 --subset-size 10 \
  --transcripts results/transcripts_subset10.json --out results/probe_subset10.json
