# What the BLJ post's media has to be

`components/BlogMario.tsx` fetches 21 files under `public/blj/`: 19 clips and the 2 posters. Every
one is the game's own renderer drawing measured state in `castle_inside` area 2, 4:3, 960×720
source. Stems are stable: a re-render replaces a file rather than adding one, so better footage
never needs a prose edit. Only the two clips that wait for a click carry a poster — the looping
ones autoplay, so their stills would be weight in git that nothing requests.

## The four-panel sets

Four separate video elements per reward, left to right, **not** a 2×2 composite — they autoplay
muted and a reader can unmute one panel at a time, which a composite cannot do.

    swarm-<rung>-<label>.mp4
      rung   height | speed | terminal | height-speed
      label  1M | 5M | 10M | 20M

Sixteen files, no posters: they loop. Rung order in the post is height (Fig. 5), speed (Fig. 6), terminal (Fig. 9),
height-speed (Fig. 10), which is the order the argument needs: the helpful reward first, the reward
that points at the bug second, and the two that say less at the end.

## The three single clips

| file | what it is | cut on |
| --- | --- | --- |
| `untrained.mp4` | Fig. 1, the cold open. 64 Marios with no policy. Silent autoplay loop, so it needs no poster. | `tools/export_swarm_render.py --random` |
| `escape.mp4` + `.jpg` | Fig. 2, the escape at quarter speed, with audio. | frames 552–580 plus the render's injection offset: the chain starts at 560, crosses at 570, peaks at 576 |
| `episode.mp4` + `.jpg` | Fig. 3, the hero run uncut, 653 frames, 21.8 s, with a burned-in readout. | the whole episode. The post draws HTML chapter marks over it at frames 0, 208, 214, 292, 560, 570, 576 and 652 |

Frame 214 is worth a beat in `escape.mp4`: −176.04, already faster than the 154-unit escape speed,
and it warps anyway because it lands at z 995.6 inside the band. That pair is the post's argument
that phase decides and not speed alone.

A clip that is not in the build renders as a dashed note naming the missing path rather than a black
rectangle, so the post can be reviewed before the footage lands. The check is a `HEAD` request that
rejects an `index.html` served by the single-page fallback, not just a 404.

## Numbers that come from outside this repo

Regenerate with `PROJECTS_ROOT=/Users/yll/Desktop node scripts/distill-results.mjs`.

- `escape` — the filmed episode's mechanical events, from `results/replay_model_endless.json`. The
  press table, the crossing frame and the clip cut points all read from it, so re-recording the
  episode moves the prose and the cuts together.
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
