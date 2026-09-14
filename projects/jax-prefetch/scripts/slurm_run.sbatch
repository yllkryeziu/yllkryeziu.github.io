#!/usr/bin/env bash
#SBATCH --job-name=jax-prefetch
#SBATCH --partition=standard
#SBATCH --nodes=1
#SBATCH --cpus-per-task=16
#SBATCH --mem=128G
#SBATCH --time=12:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.out

set -euo pipefail

WORK=/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks
ROOT="${WORK}/jax-prefetch"

export XLA_FLAGS="--xla_force_host_platform_device_count=1"
export JAX_PLATFORMS=cpu
export OMP_NUM_THREADS="${SLURM_CPUS_PER_TASK:-16}"
export VENV="${WORK}/toolchain/venv-jax"
export PYTHON_BIN=/opt/miniforge3/bin/python3

echo "node=$(hostname) cpus=${SLURM_CPUS_PER_TASK:-?}"
awk -F': ' '/^model name/ { print $2; exit }' /proc/cpuinfo

cd "${ROOT}"
bash scripts/run_all.sh

echo "=== results ==="
ls -la "${ROOT}/results"
