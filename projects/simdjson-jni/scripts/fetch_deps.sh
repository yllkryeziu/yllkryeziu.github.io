#!/usr/bin/env bash
set -euo pipefail

SIMDJSON_VERSION="4.6.11"
SIMDJSON_URL="https://github.com/simdjson/simdjson/releases/download/v${SIMDJSON_VERSION}/singleheader.zip"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT}/scripts/platform.sh"

THIRD_PARTY="${ROOT}/third_party"
STAMP="${THIRD_PARTY}/simdjson.version"

if [[ -f "${STAMP}" && "$(cat "${STAMP}")" == "${SIMDJSON_VERSION}" ]]; then
  echo "simdjson ${SIMDJSON_VERSION} already vendored"
  exit 0
fi

mkdir -p "${THIRD_PARTY}"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

curl -sS -L --retry 3 --fail -o "${WORK}/singleheader.zip" "${SIMDJSON_URL}"
unzip -q -o "${WORK}/singleheader.zip" -d "${WORK}/extract"

find "${WORK}/extract" -name 'simdjson.h' -exec cp {} "${THIRD_PARTY}/simdjson.h" \;
find "${WORK}/extract" -name 'simdjson.cpp' -exec cp {} "${THIRD_PARTY}/simdjson.cpp" \;

test -s "${THIRD_PARTY}/simdjson.h"
test -s "${THIRD_PARTY}/simdjson.cpp"

echo "${SIMDJSON_VERSION}" > "${STAMP}"
sha256_file "${THIRD_PARTY}/simdjson.h" "${THIRD_PARTY}/simdjson.cpp" > "${THIRD_PARTY}/simdjson.sha256"
echo "vendored simdjson ${SIMDJSON_VERSION}"
