# What the BLJ post's media has to be

The published `blj-media-v1` set has 21 files under `public/blj/`: 19 clips and 2 posters.
The local speed study adds 17 clips; the published `blj-media-v2` set retains all 38 assets.
The [storage guide](../../media/README.md) keeps them in versioned release assets, with deployment
fetching and verifying the [manifest](../../media/blj.json) before building the site. Each clip
uses the game's own renderer to draw measured state in `castle_inside` area 2, 4:3 at 960×720 —
the panels included, although they are displayed four to a row at a couple of hundred CSS pixels.
Filenames stay stable across re-renders; changed footage gets a new release and manifest hashes.
Only the two clips that wait for a click carry a poster — the looping
ones autoplay, so their stills would be weight in git that nothing requests.

## One locked camera, and no door

The sixteen checkpoint clips and the cold open are one vantage, `DEFAULT_CAM` in
`tools/render_swarm_shots.py` in the measurement repo: eye at (-204, 3450, 3900) looking at
(-204, 3700, 1800) through a 55 degree lens, which is behind the bottom landing at hip height. That
file records why every direction around it fails, so the sweep does not have to be repeated. Two
consequences belong to the footage rather than to the code:

- The room's own entrance, a 70 star door at z 3772, stands between that eye and the crowd, so
  these renders set `SM64_HIDE_DOORS=1` and star doors are not drawn. Ordinary and warp doors are
  still drawn, because hiding those desynchronises the movie that walks the game to the staircase
  and every shot comes out as the castle grounds. No caption refers to a door, so the hidden door
  is invisible in the prose; what it buys is the whole population in frame at panel size.
- All seventeen ship at the full 960×720 render size at crf 23 with 96k audio. They used to be
  smaller — the panels were downscaled to 640×480 at crf 34 and the cold open crf 28, a
  display-size decision that read fine at 176 px but fell apart on a retina screen, a click-through
  or a repost. The set is about 100 MB now, so a panel carries no source until it comes within
  400 px of the viewport and pauses when it leaves again — the weight is paid by the readers who
  actually scroll to the crowds.

Which makes the two commands that produce all seventeen:

    PYTHONPATH=. python tools/render_swarm_shots.py --manifest <shots>/manifest.json \
        --out_dir <out> --prefix "" --crf 23 --only untrained --no_poster
    PYTHONPATH=. python tools/render_swarm_shots.py --manifest <shots>/manifest.json \
        --out_dir <out> --crf 23 --audio_bitrate 96k --no_poster <sixteen --only>

The sixteen panels reproduce exactly: the capture is seeded (20250916, offset per shot, with the
`--random` shot first in the original run's order), so a re-capture lands the same escapes the
labels and prose quote — 77/124/183/187 for speed, 0/0/191/232 for terminal, 0/144/158/205 for
height+speed.

## The four-panel sets

Height, height+speed, and landing-only each show four separate video elements, left to right.
They autoplay muted and a reader can unmute one panel at a time. Speed uses the larger
`SpeedEvolution` viewer: a checkpoint slider, playback speed, and an optional two-clip comparison.
Only selected clips load as their players approach the viewport. Its checkpoint inventory is
`components/post/results/speed-evolution.json`; all 17 server-rendered clips are installed locally.
The viewer checks for the new media and falls back to the four published clips from
`speed-evolution-legacy.json` when it is absent. See
[the intermediate-checkpoint study](../../docs/mario-speed-evolution/README.md) for the completed
render, checkpoint provenance, downloadable viewer and published release manifest.

    swarm-<rung>-<label>.mp4
      rung   height | speed | terminal | height-speed
      label  1M | 5M | 10M | 20M

Sixteen original files, no posters: they loop. Each shows 450 frames, 15 seconds. The original
exporter counts escapes across **45 warmup + 450 recorded frames**, so those totals also include
1.5 seconds before the clip; the article now states this. The new speed study uses zero warmup,
so its counts cover exactly the visible 15 seconds. Rung order in the post is
height (Fig. 4), speed (Fig. 5), height-speed (Fig. 6), terminal (Fig. 7). Each clip shows
64 copies of one checkpoint policy sampling actions, not 64 independently trained policies.

## The three single clips

| file | what it is | cut on |
| --- | --- | --- |
| `untrained.mp4` | Fig. 1, the cold open. 64 Marios driven by the untrained network: a freshly initialised PPO, seed 2 — the landing-only run's own starting weights. Silent autoplay loop, so it needs no poster. | `tools/export_swarm_render.py --untrained` |
| `escape.mp4` + `.jpg` | Fig. 10, two beats at one eighth speed — `--slow 8`, each frame held for about a quarter of a second — 352 frames, 11.7 s. Silent: there is no audio track, because audio stretched eight times is not audio, and the caption says so. | two windows, `BEATS` in `tools/render_episode_clips.py`: replay frames 204–222 and 556–580, plus the render's injection offset |
| `episode.mp4` + `.jpg` | Fig. 2, the hero run uncut, 653 frames, 21.8 s, with a burned-in readout. | the whole episode. The post draws HTML chapter marks over it at frames 0, 208, 214, 292, 560, 570, 576 and 652 |

The first beat shows why speed alone does not guarantee a crossing: `escape.inPhase` is frame 214
at −176.04, already faster than the 154-unit band is wide, warping anyway because it lands at
z 995.6 inside the band, and
`escape.clears` is frame 217 at −381.95, stepping from z 1109 to z 878 and never touching it. Both
come out of `distill-results.mjs`, so a re-recorded episode moves the caption with the clip.

A clip that is not in the build renders as a dashed note naming the missing path rather than a black
rectangle, so the post can be reviewed before the footage lands. The check is a `HEAD` request that
rejects an `index.html` served by the single-page fallback, not just a 404.

## Numbers that come from outside this repo

Regenerate with `PROJECTS_ROOT=/Users/yll/Desktop node scripts/distill-results.mjs`.

- `escape` — the filmed episode's mechanical events, from `results/replay_model_endless.json`.
  The chapter marks, crossing frames and slow-motion caption read from these values.
- `seeds` and `rungs` — `results/episode_stats.json` and `results/curves_page.json`. Table 1
  reports seeds solved and fastest discovery; Fig. 3 shows each run's first success, with
  failures explicitly marked as censored at 20M steps.
- `occupancy` — `results/action_occupancy.json`. Fig. 8 shows the changing action mix in the
  successful landing-only run. It does not isolate the cause of those changes.
- `transfer` and `transferExpert` — `results/transfer.json` and `results/transfer_expert.json`.
  Retained in the distilled data for reference; the other-staircases section is no longer
  displayed in the article.
- `swarm` — `results/swarm_render_manifest.json`, from `tools/summarise_swarm_shots.py`.
  The original panel labels count completed escapes across warmup and recording, not success
  rates over attempts. An episode ends at the goal or a 1,200-frame timeout. New speed metadata
  comes from the separate study with no warmup and a 450-frame recording.
- `speed` — `results/throughput.json`, used in the pipeline diagram and Fig. 9's caption.
- Audio measurements and median-return curves remain in the distilled results for reference,
  but the article no longer presents them as figures or tables.

The band is drawn cyan rather than red because the endless staircase is carpeted in red and a red
band on it is invisible. Fig. 1's caption says cyan, so a recolour is a prose edit.

## Reference audit

The September 18, 2026 [reference audit](../../docs/mario-speed-evolution/reference-audit.md)
records the primary sources checked and corrections. The published comparison extract at
`public/blj-study/validation.json` retains the original measurement commit and source-file SHA-256.
It is linked as the article's own data, separately from the TAS movie attribution.
