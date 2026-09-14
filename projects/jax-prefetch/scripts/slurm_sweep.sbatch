#!/usr/bin/env bash
#SBATCH --job-name=jax-sweep
#SBATCH --partition=standard
#SBATCH --nodes=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=96G
#SBATCH --time=06:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.out

set -euo pipefail
WORK=/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks
export JAX_PLATFORMS=cpu
cd "${WORK}/jax-prefetch"
"${WORK}/toolchain/venv-jax/bin/python" -m src.eval.regime_sweep
