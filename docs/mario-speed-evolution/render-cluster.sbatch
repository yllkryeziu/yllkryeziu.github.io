#!/usr/bin/env bash
#SBATCH --job-name=blj-speed-evolution
#SBATCH --partition=interactive
#SBATCH --exclude=hai002
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=16
#SBATCH --mem=16G
#SBATCH --gres=none
#SBATCH --time=01:00:00

set -euo pipefail

module load FFmpeg/7.0.2-GCCcore-13.3.0 SDL2/2.30.6-GCCcore-13.3.0 \
  Mesa/24.1.3-GCCcore-13.3.0 Xvfb/21.1.14-GCCcore-13.3.0

MARIO_WEBSITE_ROOT="${MARIO_WEBSITE_ROOT:-/fast/project/HFMI_SynergyUnit/yll/yllkryeziu.github.io}"
MARIO_RENDER_REPO="${MARIO_RENDER_REPO:-/fast/project/HFMI_SynergyUnit/yll/mario-speed-render/measurement}"
MARIO_TRAINING_ROOT="${MARIO_TRAINING_ROOT:-/fast/project/HFMI_SynergyUnit/yll/mario-blj}"
MARIO_RENDER_OUT="${MARIO_RENDER_OUT:-/fast/project/HFMI_SynergyUnit/yll/mario-speed-render/evolution}"

export LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe
export SDL_AUDIODRIVER=dummy SDL_VIDEODRIVER=x11
export OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 TORCH_NUM_THREADS=1 LP_NUM_THREADS=4
export CUDA_VISIBLE_DEVICES="" PYTHONUNBUFFERED=1

MARIO_SCRATCH="$(mktemp -d /tmp/blj-speed-render.XXXXXX)"
trap 'rm -rf "$MARIO_SCRATCH"' EXIT

xvfb-run --auto-servernum --server-args='-screen 0 1280x1024x24 -nolisten tcp' \
  "$MARIO_TRAINING_ROOT/.venv/bin/python" \
  "$MARIO_WEBSITE_ROOT/docs/mario-speed-evolution/render.py" \
  --repo "$MARIO_RENDER_REPO" \
  --python "$MARIO_TRAINING_ROOT/.venv/bin/python" \
  --checkpoints "$MARIO_TRAINING_ROOT/results/ladder_v2/speed/seed_4/checkpoints" \
  --out "$MARIO_RENDER_OUT" --work-dir "$MARIO_SCRATCH/frames" --render-workers 4 --no-label
