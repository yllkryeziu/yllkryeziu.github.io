#!/usr/bin/env bash
set -euo pipefail

HOST="${CLUSTER_HOST:-berlin1}"
REMOTE="${CLUSTER_WORK:-/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/projects"

cd "${ROOT}"
rsync -az --itemize-changes \
  --exclude 'results/' \
  --exclude 'build/' \
  --exclude 'target/' \
  --exclude 'third_party/' \
  --exclude '.venv/' \
  --exclude '__pycache__/' \
  --exclude 'dependency-reduced-pom.xml' \
  --exclude '/simdjson-jni/data/' \
  --exclude '/jax-prefetch/data/' \
  simdjson-jni jax-prefetch "${HOST}:${REMOTE}/"
