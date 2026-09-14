#!/usr/bin/env bash
set -euo pipefail

HOST="${CLUSTER_HOST:-berlin1}"
REMOTE="${CLUSTER_WORK:-/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS="${PROJECTS_ROOT:-$(cd "${ROOT}/.." && pwd)}"

for project in simdjson-jni jax-prefetch; do
  mkdir -p "${PROJECTS}/${project}/results"
  rsync -az "${HOST}:${REMOTE}/${project}/results/" "${PROJECTS}/${project}/results/"
  echo "${project}: $(ls -1 "${PROJECTS}/${project}/results" | wc -l | tr -d ' ') files"
done

mkdir -p "${PROJECTS}/logs"
rsync -az --include '*.out' --exclude '*' "${HOST}:${REMOTE}/logs/" "${PROJECTS}/logs/"
echo "logs: $(ls -1 "${PROJECTS}/logs" | wc -l | tr -d ' ') files"
