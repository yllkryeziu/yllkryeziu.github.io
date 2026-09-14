#!/usr/bin/env bash
#SBATCH --job-name=lc-pilot
#SBATCH --partition=standard
#SBATCH --nodes=1
#SBATCH --gres=gpu:1
#SBATCH --exclude=hai002
#SBATCH --cpus-per-task=16
#SBATCH --mem=128G
#SBATCH --time=04:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.out

set -euo pipefail

WORK=/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks
LC="$WORK/latent-commitment"
export HF_HOME="$WORK/toolchain/hf"
export PYTHONPATH="$LC"
PY="$WORK/toolchain/venv-lc/bin/python"

cd "$LC"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

echo "=== eliciting model beliefs ==="
"$PY" scripts/elicit.py --model Qwen/Qwen3.5-9B --batch-size 64

echo "=== greedy games ==="
"$PY" scripts/play.py --games 200 --turns 20 --temperature 0.0 --tag greedy

echo "=== sampled games (the control) ==="
"$PY" scripts/play.py --games 200 --turns 20 --temperature 0.7 --tag sampled

echo "=== done ==="
ls -la results/
