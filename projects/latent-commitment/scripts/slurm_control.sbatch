#!/usr/bin/env bash
#SBATCH --job-name=lc-control
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

echo "=== control: does naming the animal restore self-agreement? ==="
"$PY" scripts/control.py

echo "=== greedy games (answers now deterministic by construction) ==="
"$PY" scripts/play.py --games 200 --turns 20 --temperature 0.0 --tag greedy

echo "=== sampled games at T=0.7 (answers genuinely sampled now) ==="
"$PY" scripts/play.py --games 200 --turns 20 --temperature 0.7 --tag sampled

echo "=== sampled games at T=1.0 ==="
"$PY" scripts/play.py --games 200 --turns 20 --temperature 1.0 --tag sampled_t1
