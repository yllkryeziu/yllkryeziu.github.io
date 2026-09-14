#!/usr/bin/env bash
set -euo pipefail

HOST="${CLUSTER_HOST:-berlin1}"
REMOTE="${CLUSTER_WORK:-/fast/project/HFMI_SynergyUnit/yll/blog-benchmarks}"
ROOT="${PROJECTS_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

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
  --exclude '/latent-commitment/data/' \
  simdjson-jni jax-prefetch latent-commitment "${HOST}:${REMOTE}/"
