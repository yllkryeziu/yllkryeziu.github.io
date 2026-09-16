# What the BLJ post's media has to be

`components/BlogMario.tsx` fetches 21 files under `public/blj/`: 19 clips and the 2 posters. Every
one is the game's own renderer drawing measured state in `castle_inside` area 2, 4:3 — the three
single clips at 960×720, the sixteen panels at 640×480, which is the size they are displayed at
four to a row. Stems are stable: a re-render replaces a file rather than adding one, so better footage
never needs a prose edit. Only the two clips that wait for a click carry a poster — the looping
ones autoplay, so their stills would be weight in git that nothing requests.

## The four-panel sets

Four separate video elements per reward, left to right, **not** a 2×2 composite — they autoplay
muted and a reader can unmute one panel at a time, which a composite cannot do.

    swarm-<rung>-<label>.mp4
      rung   height | speed | terminal | height-speed
      label  1M | 5M | 10M | 20M

Sixteen files, no posters: they loop. Each is the whole 450-frame capture, 15 s, which is exactly
the window `solved` counts escapes over, so a panel shows every escape its own label claims. They
were first cut to 360 frames and re-rendered at full length to remove that gap. Rung order in the
post is
height (Fig. 5), speed (Fig. 6), terminal (Fig. 9), height-speed (Fig. 10), which is the order the argument needs: the helpful reward first, the reward
that points at the bug second, and the two that say less at the end.

## The three single clips

| file | what it is | cut on |
| --- | --- | --- |
| `untrained.mp4` | Fig. 1, the cold open. 64 Marios with no policy. Silent autoplay loop, so it needs no poster. | `tools/export_swarm_render.py --random` |
| `escape.mp4` + `.jpg` | Fig. 2, two beats at one eighth speed — `--slow 8`, each frame held for about a quarter of a second — 352 frames, 11.7 s. Silent: there is no audio track, because audio stretched eight times is not audio, and the caption says so. | two windows, `BEATS` in `tools/render_episode_clips.py`: replay frames 204–222 and 556–580, plus the render's injection offset |
| `episode.mp4` + `.jpg` | Fig. 3, the hero run uncut, 653 frames, 21.8 s, with a burned-in readout. | the whole episode. The post draws HTML chapter marks over it at frames 0, 208, 214, 292, 560, 570, 576 and 652 |

The first beat is the post's argument that phase decides and not speed alone, and both halves of
it are measured rather than described: `escape.inPhase` is frame 214 at −176.04, already faster
than the 154-unit escape speed, warping anyway because it lands at z 995.6 inside the band, and
`escape.clears` is frame 217 at −381.95, stepping from z 1109 to z 878 and never touching it. Both
come out of `distill-results.mjs`, so a re-recorded episode moves the caption with the clip.

A clip that is not in the build renders as a dashed note naming the missing path rather than a black
rectangle, so the post can be reviewed before the footage lands. The check is a `HEAD` request that
rejects an `index.html` served by the single-page fallback, not just a 404.

## Numbers that come from outside this repo

Regenerate with `PROJECTS_ROOT=/Users/yll/Desktop node scripts/distill-results.mjs`.

- `escape` — the filmed episode's mechanical events, from `results/replay_model_endless.json`. The
  press table, the crossing frame and the clip cut points all read from it, so re-recording the
  episode moves the prose and the cuts together.
- The four RMS figures in the silence section's first paragraph — 3263 over the chain, 5073 for the
  ordinary long jump before it, 5867 for the flight, 5108 for the whole episode — are the only
  numbers in the post typed rather than read from JSON. They were measured on `episode.mp4`'s own
  audio track, one bucket per game frame at 32 kHz. They belong in `media_summary.json` next to the
  rest of the audio work, and should be swapped for derived values once
  `tools/summarise_media.py` reports per-phase levels for the filmed episode.
- `media` — `results/media_summary.json`, from `tools/summarise_media.py`. Table 4 and Fig. 12 are
  this file. The crowd captures write a different container and do not touch the audio it reads, so
  it does not go stale when footage is re-rendered.
- `swarm` — `results/swarm_render_manifest.json`, from `tools/summarise_swarm_shots.py`, which
  reduces the capture manifest the crowd shots were filmed from. The per-checkpoint counts the
  four-panel labels read are escapes completed inside the filmed window, not a rate over attempts:
  an episode ends at the goal or at a 1200 frame timeout and the window is 450 frames, so every
  termination in a window is an escape.
- `heightOverTerminal` and each rung's `returnModes` — `results/curves_page.json`, from
  `tools/prep_curves.py`. Fig. 7's caption is entirely these. Return on this task is bimodal, so a
  median across six seeds is not a level any seed reached, and the plateaus are not comparable
  across rungs because a solver scores 1.0 for the landing plus its rung's shaping ceiling. The
  caption quotes both modes and the count of bins on which height leads landing-only rather than
  asserting a plateau, so recomputing the curves moves the caption with them.

The band is drawn cyan rather than red because the endless staircase is carpeted in red and a red
band on it is invisible. Fig. 1's caption says cyan, so a recolour is a prose edit.
