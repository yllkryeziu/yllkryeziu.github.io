#!/usr/bin/env bash
set -euo pipefail

HOST="${CLUSTER_HOST:-berlin1}"
REMOTE="${CLUSTER_WORK:-/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for project in simdjson-jni jax-prefetch; do
  mkdir -p "${ROOT}/projects/${project}/results"
  rsync -az "${HOST}:${REMOTE}/${project}/results/" "${ROOT}/projects/${project}/results/"
  echo "${project}: $(ls -1 "${ROOT}/projects/${project}/results" | wc -l | tr -d ' ') files"
done

mkdir -p "${ROOT}/projects/logs"
rsync -az --include '*.out' --exclude '*' "${HOST}:${REMOTE}/logs/" "${ROOT}/projects/logs/"
echo "logs: $(ls -1 "${ROOT}/projects/logs" | wc -l | tr -d ' ') files"
