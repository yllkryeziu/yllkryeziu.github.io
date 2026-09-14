#!/usr/bin/env bash
#SBATCH --job-name=simdjson-jni
#SBATCH --partition=standard
#SBATCH --nodes=1
#SBATCH --exclusive
#SBATCH --time=10:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.out

set -euo pipefail

WORK=/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks
SHARED="${WORK}/simdjson-jni"
LOCAL="/tmp/simdjson-jni-${SLURM_JOB_ID}"

module purge
module load GCC/13.3.0
module load CMake/3.29.3-GCCcore-13.3.0

cleanup() {
  if [[ -d "${LOCAL}/results" ]]; then
    mkdir -p "${SHARED}/results"
    cp -f "${LOCAL}"/results/* "${SHARED}/results/" 2>/dev/null || true
  fi
  rm -rf "${LOCAL}" "/tmp/toolchain-${SLURM_JOB_ID}"
}
trap cleanup EXIT

mkdir -p "${LOCAL}"
rsync -a --exclude 'build/' --exclude 'target/' --exclude 'results/' "${SHARED}/" "${LOCAL}/"
rsync -a "${WORK}/toolchain/jdk21" "${WORK}/toolchain/maven" "/tmp/toolchain-${SLURM_JOB_ID}/"

export JAVA_HOME="/tmp/toolchain-${SLURM_JOB_ID}/jdk21"
export MVN="/tmp/toolchain-${SLURM_JOB_ID}/maven/bin/mvn"
export PYTHON=python3
export PATH="${JAVA_HOME}/bin:${PATH}"
export MAVEN_OPTS="-Dmaven.repo.local=/tmp/toolchain-${SLURM_JOB_ID}/m2"
rsync -a "${WORK}/toolchain/m2/" "/tmp/toolchain-${SLURM_JOB_ID}/m2/" 2>/dev/null || true

export SCALING_THREADS="1 2 4 8 16"
NODE0_CPUS="$(lscpu | sed -n 's/^NUMA node0 CPU(s): *//p')"
if command -v numactl >/dev/null 2>&1; then
  export BENCH_PIN="numactl --cpunodebind=0 --membind=0"
elif command -v taskset >/dev/null 2>&1 && [[ -n "${NODE0_CPUS}" ]]; then
  export BENCH_PIN="taskset -c ${NODE0_CPUS}"
fi

echo "node=$(hostname) cpus=$(nproc) local=${LOCAL} pin=${BENCH_PIN:-none}"
lscpu | grep -E "Model name|Socket|Core\(s\)|NUMA node\(s\)"
df -h /tmp | tail -1

cd "${LOCAL}"
bash scripts/run_bench.sh

python3 -c "
import json
d = json.load(open('${LOCAL}/results/summary.json'))
print('failures:', d.get('failures'))
print('sections:', [k for k in d if k[1:2] == '_'])
"
