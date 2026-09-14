#!/usr/bin/env bash
#SBATCH --job-name=lc-steer
#SBATCH --partition=standard
#SBATCH --nodes=1
#SBATCH --gres=gpu:1
#SBATCH --exclude=hai002
#SBATCH --cpus-per-task=16
#SBATCH --mem=128G
#SBATCH --time=06:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.out

set -euo pipefail
WORK=/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks
LC="$WORK/latent-commitment"
export HF_HOME="$WORK/toolchain/hf"
export PYTHONPATH="$LC"
PY="$WORK/toolchain/venv-lc/bin/python"
cd "$LC"

nvidia-smi --query-gpu=name --format=csv,noheader
"$PY" scripts/steer.py --train-samples 2400 --eval-samples 300
