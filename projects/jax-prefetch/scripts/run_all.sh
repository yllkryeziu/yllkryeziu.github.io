#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV="${VENV:-$PROJECT_ROOT/.venv}"

if [ ! -d "$VENV" ]; then
  "$PYTHON_BIN" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --upgrade pip
  "$VENV/bin/pip" install -r requirements.txt
fi

for archive in data/NASA_access_log_Jul95.gz data/NASA_access_log_Aug95.gz data/msnbc990928.seq.gz; do
  if [ ! -f "$archive" ]; then
    echo "missing dataset: $archive" >&2
    exit 1
  fi
done

"$VENV/bin/python" -m src.data.prepare > /dev/null
"$VENV/bin/python" -m src.model.run_predictor
"$VENV/bin/python" -m src.eval.experiment
"$VENV/bin/python" -m src.eval.report

echo "results written to $PROJECT_ROOT/results"
