# Speed policy: intermediate checkpoints

The four previously published speed clips are seed 4 at 999,960, 4,999,800, 9,999,600,
and 19,999,200 training steps. That run first reached the landing at **580,644 steps**, so
the first published clip skips the initial discovery.

## What exists

The cluster holds **200 checkpoints for each of the six speed seeds** under
`/fast/project/HFMI_SynergyUnit/yll/mario-blj/results/ladder_v2/speed/seed_<n>/checkpoints/`.
For seed 4 they span 99,996–19,999,200 steps at intervals of 99,996. Use `ladder_v2`, not
the earlier `ladder` experiment. Seed 4's episode totals at the 20M cutoff match the website's
distilled results exactly: 120,600 episodes and 120,290 successes.

The cluster directory is an older rsynced source snapshot, not a Git checkout. It has the
weights but lacks the current video tools. The current measurement source was inspected at
[`d300897`](https://github.com/yllkryeziu/mario-blj/tree/d300897dfbb0ddfaa452781b97a8002454ccb85a).
Its handoff identifies the original local working tree as `/Users/yll/Desktop/mario-blj`.

`study.json` records the selected checkpoint filenames, exact steps, sizes and SHA-256 hashes;
the measured training bins; the episode CSV hash; and hashes of the inspected capture source.
All **17 clips have been rendered on the server**, reviewed and installed in the local blog.
Slurm job `154093` completed successfully. The output is at
`/fast/project/HFMI_SynergyUnit/yll/mario-speed-render/evolution/`.
Each file was checked for H.264/AAC, 960×720, 450 frames at 30fps, 15 seconds and visible image content.

## Where the current videos came from

1. [`tools/export_swarm_render.py`](https://github.com/yllkryeziu/mario-blj/blob/d300897dfbb0ddfaa452781b97a8002454ccb85a/tools/export_swarm_render.py)
   loads one PPO checkpoint and runs 64 policy copies in libsm64. It records their positions,
   animation states and crowd audio. These are copies of one network, not 64 training seeds.
2. [`tools/render_swarm_shots.py`](https://github.com/yllkryeziu/mario-blj/blob/d300897dfbb0ddfaa452781b97a8002454ccb85a/tools/render_swarm_shots.py)
   loads those trajectories into the patched `sm64-port`, using a TAS replay to reach the
   staircase. The game draws the recorded crowd with its own models and lighting. ffmpeg
   encodes the frame dump and muxes the recorded audio.
3. The measurement repo's `results/swarm_render_manifest.json` records the checkpoint paths
   and measurements. The website's `media/blj.json` pins the rendered files in the
   `blj-media-v1` GitHub release; `scripts/media.mjs` fetches and verifies them for deployment.

The published settings are 64 Marios, 450 recorded frames (15s at 30fps), 45 warmup frames,
1,200-frame episode limit, lateral spawn spread 150, stochastic actions, and base sampling
seed 20250916 **offset by shot order**. The original order included a random-action shot first.
The original seed-4 checkpoint paths were `data/checkpoints/speed_seed_4_grid/ppo_<steps>_steps.zip`.
Their recorded escape counts are 77, 124, 183 and 187. Counts can exceed 64 because copies respawn.

Rendering uses 960×720, camera `-204,3450,3900,-204,3700,1800,55`, gamma 2.0, x264 CRF 23,
AAC 96k, the cyan warp band, and hidden star doors. The TAS stops steering at frame 6731;
swarm injection starts at 6740, with the frame dump starting at 6739 to account for swap timing.
The website's cold-open network uses **seed 2**, so it is not the appropriate starting network
for this seed-4 study.

## Where to look more closely

The training CSV already suggests a short transition:

| Training window | Successful / finished episodes | Success fraction |
| --- | ---: | ---: |
| 400k–500k | 0 / 24 | 0% |
| 500k–600k | 1 / 37 | 2.7% |
| 600k–700k | 11 / 42 | 26.2% |
| 700k–800k | 27 / 48 | 56.3% |
| 800k–900k | 79 / 90 | 87.8% |
| 900k–1M | 219 / 224 | 97.8% |

These are online training episodes, grouped by their completion timestep. Policies change
within each window, and training uses a fixed spawn and a 3,000-frame episode budget.
They are not evaluations of each saved checkpoint and not the escape counts of a 15-second
swarm capture. The videos allow those changes to be examined directly. The captures have zero escapes through
600k, then 2 at 700k, 7 at 800k, 16 at 900k and 68 at 1M. Early policies already move and jump;
zero escapes does not mean they do nothing. A short capture with spread-out starts can still
have no escapes after the first success recorded during training.

The completed study captures the untrained seed-4 network, then 0.1M through 1M in 0.1M increments,
followed by 1.5M, 2M, 3M, 5M, 10M and 20M: **17 clips**. The 0-step network is reconstructed
from seed 4 using the current model constructor, not loaded from an archived initial checkpoint.
The saved checkpoints cannot resolve the historical transition more finely than roughly 100k steps.

Every shot starts in a separate process with the same capture seed, avoiding the original tool's
per-shot seed offset. Initial spawn jitter is shared; later trajectories and respawns can diverge.
Recording starts immediately (**zero warmup**) to show the first actions and make the escape
count refer to precisely the recorded window. The upstream exporter also counts terminations
during warmup, so we avoid that ambiguity rather than changing the measurement source.
Other capture and rendering settings match the existing clips. One stochastic capture is an
illustration; use additional `--seed` values if behavior needs checking across repeated samples.

## Remote rendering

The server has the necessary graphics dependencies as environment modules. Its older game binary
uses a dummy graphics backend for physics validation, so it cannot generate the blog footage.
A separate working tree is prepared at
`/fast/project/HFMI_SynergyUnit/yll/mario-speed-render/measurement/`, using the measurement commit
above, sm64-port `2b17d081c9798b31b91dc71f37994b0da28cffc9` and libsm64
`fd11813208272b4271d92bd92feb8f3fdbe61be5`.

Apply the measurement repo's existing patches, then `linux-renderer.patch` to sm64-port.
The additional patch selects its SDL window backend on Linux, so the existing frame-dump hooks
work under Xvfb. This SDL module exposes GLES, so the patch explicitly requests a GLES context
and emits compatible GLSL ES 1.00 shaders with high-precision floats. Frame readback uses RGBA
and strips alpha when writing the original RGB PPM format, as GLES does not guarantee RGB readback.
Unused physical-controller
and audio-device backends are omitted. It changes
the rendering build, not training physics. Build with:

```sh
module load FFmpeg/7.0.2-GCCcore-13.3.0 SDL2/2.30.6-GCCcore-13.3.0 \
  Mesa/24.1.3-GCCcore-13.3.0 Xvfb/21.1.14-GCCcore-13.3.0
make -C third_party/libsm64 lib -j4
make -C third_party/sm64-port -j8 VERSION=us RENDER_API=GL COMPARE=0
```

Build and render on compute nodes. `render-cluster.sbatch` loads those modules and runs the
prepared job under Xvfb with Mesa software rendering. Four independent render workers share a
16-CPU allocation, each with separate replay, frame and output directories. Large temporary
frame dumps use node-local scratch storage. It uses `--no-label` because this FFmpeg build lacks drawtext; the blog and
comparison viewer supply the checkpoint labels in HTML. The resulting videos keep the same
camera, resolution, duration and encoding quality as the planned local renders.

The untrained network and every saved checkpoint from 100k through 500k are included to examine
the lead-up to the first training success. There is no archived checkpoint exactly at 580,644:
499,980 and 599,976 bracket that event.

## Alternative: run on the Mac

The prepared `speed-evolution-local.tar.gz` contains these instructions, the runner, gallery,
study manifest and 16 selected checkpoints. It contains no ROM or game assets. From a Mac terminal:

```sh
scp yll.kryeziu@hai-login1.haicore.berlin:/fast/project/HFMI_SynergyUnit/yll/yllkryeziu.github.io/docs/mario-speed-evolution/speed-evolution-local.tar.gz ~/Downloads/
tar -xzf ~/Downloads/speed-evolution-local.tar.gz -C ~/Downloads
python3 ~/Downloads/speed-evolution/render.py --repo ~/Desktop/mario-blj --check
python3 ~/Downloads/speed-evolution/render.py --repo ~/Desktop/mario-blj
```

The runner uses the measurement repo's `.venv/bin/python` when available; `--python` overrides it.
It checks Python 3.11+, dependencies, ffmpeg with libx264/drawtext, the existing patched game
binary, libsm64, the ROM, collision data and TAS replay before capturing. It verifies checkpoint
and source hashes and refuses to overwrite an existing output directory. `--dry-run` prints
the commands and checks weights without requiring the Mac's native libraries.

If the source differs, inspect the difference against the commit above before running; the
runner deliberately does not replace files or reset the existing local checkout. The original
Mac setup should already have the game build and replay. `scripts/setup.sh` alone builds libsm64,
not the game renderer. Allow roughly 1GB of temporary frame storage plus final videos.

Output defaults to `~/Desktop/mario-blj/data/renders/speed-evolution-20250916/`:

- `index.html`: offline comparison viewer with two selectable clips, shared seek, replay and speed.
- `videos/`: rendered MP4s and the renderer's inventory. Filenames use `speed-evolution-` so these
  captures do not overwrite the old published clips.
- `captures/`: trajectories, audio, individual manifests and their combined manifest.
- `run.json`, `python-packages.txt`, `study.json`: capture commands, seed, native binary hashes,
  Python versions and checkpoint provenance.
- `speed-evolution.json`: measured checkpoint metadata ready for the blog viewer.
- `media-files.json`: filenames, sizes and SHA-256 hashes for the new release assets.

Mac access is optional now that the server rendering workflow is available. The commands above
remain useful for reproducing or extending the study locally.

## Blog integration

The Mario speed section now uses `components/post/SpeedEvolution.tsx`: one large video,
checkpoint slider, previous/next buttons, playback speed and an optional side-by-side comparison.
It uses all 17 new clips when they are installed. A metadata-only request checks availability;
when the new release is absent, it falls back to the four existing release clips. This keeps a
clean checkout with `blj-media-v1` usable. Playback and comparison load only selected clips.
The other reward comparisons keep their existing presentations.

`blj-media-v2.json` is the published release manifest with all 21 old assets and
17 new clips (38 total). The 17 additions total 119.8 MiB. All 38 files were uploaded to the new release, downloaded again with authentication, and checked
against the manifest before publication. `media/blj.json` now pins v2. The v1 release stays immutable. Copying media into the ignored
local `public/blj/` directory does not publish it through CI.

## Download the finished comparison viewer

`speed-evolution-videos.zip` contains `speed-evolution-videos/index.html`, all 17 videos and their
provenance/measurement manifests. It needs no Python, ROM or server. Download from a Mac terminal:

```sh
scp yll.kryeziu@hai-login1.haicore.berlin:/fast/project/HFMI_SynergyUnit/yll/yllkryeziu.github.io/docs/mario-speed-evolution/speed-evolution-videos.zip ~/Downloads/
unzip -q ~/Downloads/speed-evolution-videos.zip -d ~/Downloads
open ~/Downloads/speed-evolution-videos/index.html
```

The default comparison is 500k against 600k. Both selectors include the reconstructed untrained
network and every 100k checkpoint up to 1M. The shared seek and ¼× playback support closer inspection.

The approved index design is now implemented in `components/Blog.tsx`; the original preview
remains under `docs/blog-redesign/`. Image panels use the full existing page width, more than
twice the previous width and height. All five articles use the simplified shared layout.

## Verification

`npx tsc --noEmit`, `npm run build` and `git diff --check` pass. Browser checks cover all 17
checkpoint selections, offscreen loading, 500k/600k comparison, ¼× playback, shared replay/pause,
keyboard navigation, 390px/320px widths, 13 reference links and the corrected BibTeX. Both 404
and HTML media responses fall back to the published clips. The offline gallery loads all 17
clips from `file://` and its shared seek works. All 38 proposed release assets match their sizes
and SHA-256 hashes. The downloadable ZIP passed its archive integrity check.
