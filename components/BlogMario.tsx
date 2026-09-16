import React from 'react';
import Article, { H2, H3, Note, KeyNumbers } from './post/Article';
import Figure from './post/Figure';
import Table from './post/Table';
import Code from './post/Code';
import { M } from './post/Math';
import References, { makeCite } from './post/References';
import { LineChart, BarChart } from './post/Charts';
import { BLJ_REFS, BLJ_BIBTEX } from './post/refsBlj';
import { POST_BY_SLUG } from './post/posts';
import results from './post/results/mario.json';

const Cite = makeCite(BLJ_REFS);
const meta = POST_BY_SLUG.blj;

const TOC = [
  { id: 'crowd', label: 'Sixty-four Marios, no policy' },
  { id: 'exploit', label: 'The bug they have to find' },
  { id: 'training', label: 'How this was trained' },
  { id: 'height', label: 'The helpful reward' },
  { id: 'speed', label: 'The reward that points at the bug' },
  { id: 'curves', label: 'Reward against steps' },
  { id: 'silence', label: 'Saying nothing at all' },
  { id: 'limits', label: 'What this does not show' },
];

const millions = (steps: number | null) =>
  steps === null ? 'never' : `${(steps / 1e6).toFixed(2)}M`;
const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const num = (value: number) => value.toLocaleString('en-US');
const signed = (value: number, digits = 1) => value.toFixed(digits);
// Checkpoint step counts land just short of a round number, so they read as the round one unless
// the checkpoint is genuinely between two: 2M and 20M, but 6.3M.
const ckpt = (steps: number) => {
  const m = steps / 1e6;
  return `${Math.abs(m - Math.round(m)) < 0.05 ? Math.round(m) : m.toFixed(1)}M`;
};

const RUNG_LABEL: Record<string, string> = {
  terminal: 'Landing only',
  speed: 'Speed',
  height: 'Height',
  height_speed: 'Height + speed',
};

const RUNG_ORDER = ['speed', 'height_speed', 'terminal', 'height'];

const rungByName = (name: string) => results.rungs.find(rung => rung.name === name)!;
const seedsOf = (name: string) =>
  results.seeds.filter(seed => seed.rung === name).slice().sort((a, b) => {
    if (a.firstSuccess === null) return 1;
    if (b.firstSuccess === null) return -1;
    return a.firstSuccess - b.firstSuccess;
  });
const solvedIn = (name: string) => seedsOf(name).filter(seed => seed.firstSuccess !== null);

// Return is bimodal on this task, so a rung has two levels rather than one: 1.0 for the landing
// plus its shaping ceiling, or the shaping alone. `plateau` is where the median curve actually
// ends, which for a rung whose seeds disagree is neither of them.
const modeOf = (name: string, half: 'solved' | 'never') =>
  rungByName(name).returnModes[half].return!.toFixed(2);
const plateau = (name: string) => {
  const curve = rungByName(name).medianReturn;
  return curve[curve.length - 1][1].toFixed(2);
};
const fastestIn = (name: string) => {
  const solved = solvedIn(name);
  return solved.length ? Math.min(...solved.map(seed => seed.firstSuccess!)) : null;
};

const escape = results.escape;
const speed = results.speed;
// The filmed episode's own audio, one bucket per game frame, with every window derived from the
// replay by tools/summarise_media.py rather than written down here. `chain` is the run from its
// first amplifying press to its last, anchored on the press that produced the episode's peak.
const audioPhases = results.media.episodeAudio.phases;
const occupancy = results.occupancy;

const speedDiscovered = solvedIn('speed');
const earliest = Math.min(...speedDiscovered.map(seed => seed.firstSuccess!));
const latest = Math.max(...speedDiscovered.map(seed => seed.firstSuccess!));
const spread = latest / earliest;
const terminalSolver = results.seeds.find(
  seed => seed.rung === 'terminal' && seed.firstSuccess !== null,
)!;
const discovered = results.seeds.filter(seed => seed.firstSuccess !== null);
const stalled = results.seeds.filter(seed => seed.firstSuccess === null);
const stalledPeaks = stalled.map(seed => seed.bestPeak).sort((a, b) => a - b);
const stalledBestPeak = stalledPeaks[0];
const stalledSecondPeak = stalledPeaks[1];
const overshoot = Math.abs(escape.peak) / results.escapeSpeed;
// The one press in the table that pays friction instead of multiplying, against the weakest press
// that does multiply. Both read out of the table's own rows so the caption cannot drift from it.
const pressRatios = escape.presses
  .map(row => row.ratio)
  .filter((ratio): ratio is number => ratio !== null);
const dragRatio = Math.min(...pressRatios);
const weakestAmplify = Math.min(...pressRatios.filter(ratio => ratio >= 1.3));

const heightSeeds = seedsOf('height');
const heightEpisodes = heightSeeds.reduce((sum, seed) => sum + seed.episodes, 0);
const heightWarps = heightSeeds.map(seed => seed.warps).filter(warps => warps > 0);
const heightWarpLo = Math.min(...heightWarps);
const heightWarpHi = Math.max(...heightWarps);
const heightPeaks = heightSeeds.map(seed => seed.bestPeak).sort((a, b) => a - b);
const heightMedianPeak = (heightPeaks[2] + heightPeaks[3]) / 2;

const mediaByRung = (name: string) => results.media.rungs.find(row => row.rung === name)!;
const trapped = mediaByRung('height');
const escapingRms = RUNG_ORDER.filter(name => name !== 'height').map(name => mediaByRung(name).audio.rms);
const escapingCentroid = RUNG_ORDER.filter(name => name !== 'height')
  .map(name => mediaByRung(name).audio.centroid_hz);

const progression = results.media.progression;
const preDiscovery = progression.filter(point => point.steps <= terminalSolver.firstSuccess!);
const postDiscovery = progression.filter(point => point.steps > terminalSolver.firstSuccess!);
const meanOf = (points: { rms: number }[]) =>
  points.reduce((sum, point) => sum + point.rms, 0) / points.length;
const preLevel = meanOf(preDiscovery);
const postLevel = meanOf(postDiscovery);
const levelDrop = 1 - postLevel / preLevel;

const randomRef = occupancy.reference.find(row => row.policy === 'uniform random')!;
const untrainedRef = occupancy.reference.find(row => row.policy === 'untrained network')!;
const atStep = (target: number) =>
  occupancy.checkpoints.reduce((best, row) =>
    Math.abs(row.steps - target) < Math.abs(best.steps - target) ? row : best);
const early = atStep(2e6);
const rising = atStep(6e6);
const relapse = atStep(6.3e6);
const breakthrough = atStep(7e6);
const converged = occupancy.checkpoints[occupancy.checkpoints.length - 1];

const X_TICKS = [0, 5e6, 10e6, 15e6, 20e6].map(v => ({ v, label: `${v / 1e6}M` }));

// LineChart draws a marker at every point, so a 79-sample curve has to be thinned before it stops
// reading as a band.
function thin<T>(points: T[], target = 22): T[] {
  if (points.length <= target) return points;
  const step = (points.length - 1) / (target - 1);
  return Array.from({ length: target }, (_, i) => points[Math.round(i * step)]);
}

const RETURN_SERIES = RUNG_ORDER.map(name => {
  const rung = rungByName(name);
  return {
    label: `${RUNG_LABEL[name]} · ${rung.solved}/${rung.total}`,
    points: thin(rung.medianReturn).map(([x, y]) => ({ x, y })),
  };
});

const OCCUPANCY_SERIES = [
  {
    label: 'ground pound',
    points: occupancy.checkpoints.map(row => ({ x: row.steps, y: row.groundPound.mean })),
  },
  {
    label: 'long jump',
    points: occupancy.checkpoints.map(row => ({ x: row.steps, y: row.longJump.mean })),
  },
];

const RMS_SERIES = [
  {
    label: 'output level',
    points: progression.map(point => ({ x: point.steps, y: point.rms })),
  },
];

const DISCOVERY_BARS = results.seeds
  .slice()
  .sort((a, b) => {
    const av = a.firstSuccess ?? Infinity;
    const bv = b.firstSuccess ?? Infinity;
    if (av !== bv) return av - bv;
    return a.rung.localeCompare(b.rung);
  })
  .map(seed => ({
    label: `${RUNG_LABEL[seed.rung]} s${seed.seed}`,
    value: seed.firstSuccess ?? results.totals.maxTimesteps,
    display: seed.firstSuccess === null ? 'never' : millions(seed.firstSuccess),
    subject: seed.firstSuccess !== null,
    note: seed.firstSuccess === null ? `peak ${signed(seed.bestPeak)}` : undefined,
  }));

const LAUNCH_CODE = `//! (BLJ's) This properly handles long jumps from getting forward speed with
//  too much velocity, but misses backwards longs allowing high negative speeds.
if ((m->forwardVel *= 1.5f) > 48.0f) {
    m->forwardVel = 48.0f;
}`;

const BRAKE_CODE = `//! Uncapped air speed. Net positive when moving forward.
if (m->forwardVel > dragThreshold) {
    m->forwardVel -= 1.0f;
}
if (m->forwardVel < -16.0f) {
    m->forwardVel += 2.0f;
}`;

const SLIDE_CODE = `s32 should_begin_sliding(struct MarioState *m) {
    if (m->input & INPUT_ABOVE_SLIDE) {
        s32 slideLevel = (m->area->terrainType & TERRAIN_MASK) == TERRAIN_SLIDE;
        s32 movingBackward = m->forwardVel <= -1.0f;

        if (slideLevel || movingBackward || mario_facing_downhill(m, FALSE)) {
            return TRUE;
        }
    }

    return FALSE;
}`;

const WARP_CODE = `if ((floor = gMarioState->floor) != NULL) {
    s32 index = floor->type - SURFACE_INSTANT_WARP_1B;
    if (index >= INSTANT_WARP_INDEX_START && index < INSTANT_WARP_INDEX_STOP
        && gCurrentArea->instantWarps != NULL) {
        struct InstantWarp *warp = &gCurrentArea->instantWarps[index];

        if (warp->id != 0) {
            gMarioState->pos[0] += warp->displacement[0];
            gMarioState->pos[1] += warp->displacement[1];
            gMarioState->pos[2] += warp->displacement[2];`;

const STICK_CODE = `gController.stickX = -64.0f * inputs->stickX;
gController.stickY = -64.0f * inputs->stickY;`;

// Media. Every clip is the game's own renderer drawing measured state; the cut points come from
// results.escape, so re-recording the episode moves the prose and the cuts together. Stems are
// stable, so a re-render replaces a file rather than adding one. See components/post/blj-media.md.
const SWARM_STEPS = ['1M', '5M', '10M', '20M'];
const MEDIA = {
  untrained: 'untrained.mp4',
  escape: 'escape.mp4',
  episode: 'episode.mp4',
  swarm: (rung: string, label: string) => `swarm-${rung.replace(/_/g, '-')}-${label}.mp4`,
};

// Episodes each 64-policy population finished inside the fifteen second window that was filmed,
// per checkpoint, measured during the crowd captures themselves. Every termination inside a window
// that short is an escape — an episode otherwise runs to a 1200 frame timeout, and the window is
// 450 — so this is escapes completed by a population of sixty four and not a rate over attempts.
const swarmManifest = results.swarm as {
  solved: Record<string, number[]>;
  rungs: Record<string, { label: string; peakBackward: number }[]>;
};
const solvedAt = (rung: string): number[] => swarmManifest.solved[rung];
// Fastest backwards frame any of a rung's four filmed populations reached, which is the
// caption's claim about what the reader is watching rather than a claim about training.
const swarmPeak = (rung: string): number =>
  Math.min(...swarmManifest.rungs[rung].map(row => row.peakBackward));
// Per checkpoint, because the peak does not trend with the checkpoint and a sentence about one
// panel must not quote another panel's number. A population's peak is its single fastest Mario,
// so it is an extreme of 64 and swings on one runaway chain; the escape count is the stable
// quantity. Negative index counts from the last panel.
const swarmPeakAt = (rung: string, index: number): number => {
  const rows = swarmManifest.rungs[rung];
  return rows[index < 0 ? rows.length + index : index].peakBackward;
};

// A clip that waits for a click carries preload="none", so the browser never requests the file and
// never fires an error for a missing one; it would draw as a dead black rectangle instead. Each
// clip therefore probes for its own source and says what is absent rather than showing nothing.
// A single-page host answers an unknown path with the app's own index.html rather than a 404, so
// the content type decides this and not the status: a video that comes back as HTML is not there.
function useAvailable(src: string): boolean | null {
  const [ok, setOk] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    let live = true;
    fetch(src, { method: 'HEAD' })
      .then(response => {
        const type = response.headers.get('content-type') ?? '';
        if (live) setOk(response.ok && !type.startsWith('text/html'));
      })
      .catch(() => { if (live) setOk(false); });
    return () => { live = false; };
  }, [src]);
  return ok;
}

const Missing: React.FC<{ src: string }> = ({ src }) => (
  <div className="post-clip-missing">{src} is not in this build</div>
);

const Clip: React.FC<{
  src: string;
  caption: React.ReactNode;
  n: number;
  loop?: boolean;
  wide?: boolean;
}> = ({ src, caption, n, loop, wide }) => {
  const path = `blj/${src}`;
  const available = useAvailable(path);
  return (
    <Figure n={n} caption={caption}>
      {available === false ? (
        <Missing src={path} />
      ) : (
        <video
          src={path}
          poster={loop ? undefined : `blj/${src.replace(/\.mp4$/, '.jpg')}`}
          controls
          muted={loop}
          loop={loop}
          autoPlay={loop}
          playsInline
          preload={loop ? 'auto' : 'none'}
          style={{ width: '100%', maxWidth: wide ? '100%' : '640px', margin: '0 auto' }}
        />
      )}
    </Figure>
  );
};

// Four checkpoints of one population, left to right. They autoplay muted, because four game audio
// streams at once is noise; one panel at a time can be unmuted, and unmuting one mutes the rest.
const SwarmRow: React.FC<{ n: number; rung: string; caption: React.ReactNode }> = ({ n, rung, caption }) => {
  const [audible, setAudible] = React.useState<string | null>(null);
  const counts = solvedAt(rung);
  return (
    <Figure n={n} caption={caption}>
      <div className="post-swarm">
        {SWARM_STEPS.map((label, i) => {
          const path = `blj/${MEDIA.swarm(rung, label)}`;
          const on = audible === label;
          return (
            <div key={label}>
              <SwarmPanel path={path} muted={!on} />
              <span className="cell-label">
                <span className="step">{label}</span>
                {counts[i]} solved
                <button
                  className="post-unmute"
                  onClick={() => setAudible(on ? null : label)}
                  aria-pressed={on}
                >
                  {on ? 'mute' : 'unmute'}
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </Figure>
  );
};

const SwarmPanel: React.FC<{ path: string; muted: boolean }> = ({ path, muted }) => {
  const available = useAvailable(path);
  if (available === false) return <Missing src={path} />;
  return (
    <video
      src={path}
      muted={muted}
      loop
      autoPlay
      playsInline
      preload="auto"
      style={{ width: '100%' }}
    />
  );
};

// The hero run, with chapter marks taken from the episode's own mechanical events rather than from
// round numbers: the three warps, the launch, the crossing, the peak, the landing.
const warpLabel = (velocity: number) => {
  if (velocity >= 0) return 'Warped back while walking';
  if (Math.abs(velocity) > results.escapeSpeed) {
    return `Warped back at ${signed(velocity, 1)} — already past the escape speed`;
  }
  return `Warped back at ${signed(velocity, 1)}`;
};

const CHAPTERS = [
  { frame: 0, label: 'Spawn' },
  ...escape.warps.map(warp => ({ frame: warp.frame, label: warpLabel(warp.velocity) })),
  { frame: escape.chain.start, label: 'The chain starts compounding' },
  { frame: escape.chain.escapeFrame ?? escape.chain.peakFrame, label: 'Clears the band' },
  { frame: escape.chain.peakFrame, label: `Peak · ${signed(escape.peak, 1)}` },
  { frame: escape.chain.landingFrame ?? escape.frames - 1, label: 'Top landing' },
];

const Hero: React.FC<{ n: number; caption: React.ReactNode }> = ({ n, caption }) => {
  const path = `blj/${MEDIA.episode}`;
  const available = useAvailable(path);
  const video = React.useRef<HTMLVideoElement>(null);
  const seek = (frame: number) => {
    const element = video.current;
    if (!element) return;
    element.currentTime = frame / results.media.frameRate;
    void element.play();
  };
  return (
    <Figure n={n} caption={caption}>
      {available === false ? (
        <Missing src={path} />
      ) : (
        <video
          ref={video}
          src={path}
          poster={`blj/${MEDIA.episode.replace(/\.mp4$/, '.jpg')}`}
          controls
          playsInline
          preload="none"
          style={{ width: '100%' }}
        />
      )}
      <ol className="post-chapters">
        {CHAPTERS.map(chapter => (
          <li key={`${chapter.frame}-${chapter.label}`}>
            <button onClick={() => seek(chapter.frame)}>
              <span className="at">{(chapter.frame / results.media.frameRate).toFixed(1)}s</span>
              <span>{chapter.label}</span>
              <span className="frame">frame {chapter.frame}</span>
            </button>
          </li>
        ))}
      </ol>
    </Figure>
  );
};

// The three processes and what crosses between them. Drawn rather than described because the
// interesting part is that the physics and the renderer are the same 1996 code reached two
// different ways, and a paragraph makes that sound like one system.
const TEXT = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const SUBTLE = 'var(--color-text-subtle)';
const BORDER = 'var(--color-border)';
const SOFT = 'var(--color-border-light)';
const COOL = 'var(--series-1)';
const WARM = 'var(--series-2)';

const Pipeline: React.FC = () => {
  const box = (x: number, y: number, w: number, h: number, stroke: string) => (
    <rect x={x} y={y} width={w} height={h} rx="5" fill={SOFT} stroke={stroke} strokeWidth="1.2" />
  );
  const label = (x: number, y: number, text: string, weight = '650', size = 11.5, fill = TEXT) => (
    <text x={x} y={y} fontFamily="var(--font-sans)" fontSize={size} fontWeight={weight} fill={fill}>
      {text}
    </text>
  );
  const mono = (x: number, y: number, text: string, fill = MUTED) => (
    <text x={x} y={y} fontFamily="var(--font-mono)" fontSize="10.5" fill={fill}>{text}</text>
  );
  return (
    <svg viewBox="0 0 640 286" role="img" aria-label="The training and rendering pipeline">
      <defs>
        <marker id="blj-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={MUTED} />
        </marker>
      </defs>

      {label(0, 12, 'TRAINING', '650', 11, MUTED)}

      {box(0, 24, 176, 62, COOL)}
      {label(14, 46, 'PPO')}
      {mono(14, 62, `small MLP, ${speed.envs} envs`)}
      {mono(14, 76, `${num(speed.loop)} steps/s in the loop`)}

      {box(232, 24, 176, 62, BORDER)}
      {label(246, 46, 'libsm64')}
      {mono(246, 62, "the decompilation's Mario")}
      {mono(246, 76, 'sm64_mario_tick per frame')}

      <line x1="176" y1="44" x2="226" y2="44" stroke={MUTED} strokeWidth="1.2" markerEnd="url(#blj-arrow)" />
      <text x={201} y={38} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5" fill={SUBTLE}>1 of 36</text>
      <line x1="226" y1="68" x2="180" y2="68" stroke={MUTED} strokeWidth="1.2" markerEnd="url(#blj-arrow)" />
      <text x={203} y={82} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5" fill={SUBTLE}>24 floats</text>

      {box(444, 24, 196, 62, BORDER)}
      {label(458, 46, 'the staircase')}
      {mono(458, 62, '1,923 triangles, 12 of them')}
      {mono(458, 76, 'SURFACE_INSTANT_WARP_1B')}
      <line x1="408" y1="55" x2="438" y2="55" stroke={MUTED} strokeWidth="1.2" markerEnd="url(#blj-arrow)" />

      <line x1="320" y1="86" x2="320" y2="128" stroke={MUTED} strokeWidth="1.2" markerEnd="url(#blj-arrow)" />
      <text x={330} y={112} fontFamily="var(--font-mono)" fontSize="9.5" fill={SUBTLE}>
        recorded state, per frame
      </text>

      {label(0, 148, 'RENDERING', '650', 11, MUTED)}

      {box(232, 160, 176, 62, WARM)}
      {label(246, 182, 'sm64-port')}
      {mono(246, 198, 'the real renderer, handed')}
      {mono(246, 212, 'the recorded state')}

      {box(0, 160, 176, 62, BORDER)}
      {label(14, 182, '64 Marios')}
      {mono(14, 198, 'one GlobalState each,')}
      {mono(14, 212, 'one shared collision list')}
      <line x1="176" y1="191" x2="226" y2="191" stroke={MUTED} strokeWidth="1.2" markerEnd="url(#blj-arrow)" />

      {box(444, 160, 196, 62, BORDER)}
      {label(458, 182, 'frames and audio')}
      {mono(458, 198, "the game's own mixer, one")}
      {mono(458, 212, 'tick for the whole crowd')}
      <line x1="408" y1="191" x2="438" y2="191" stroke={MUTED} strokeWidth="1.2" markerEnd="url(#blj-arrow)" />

      <text x={0} y={252} fontFamily="var(--font-sans)" fontSize="11" fill={SUBTLE}>
        The physics and the renderer are the same 1996 code reached two ways. Nothing in the loop
      </text>
      <text x={0} y={268} fontFamily="var(--font-sans)" fontSize="11" fill={SUBTLE}>
        re-simulates the policy's trajectory: the renderer is handed the state that was measured.
      </text>
    </svg>
  );
};

const BlogMario: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <Article
    onBack={onBack}
    kicker={meta.kicker}
    title={meta.title}
    dek={meta.dek}
    date={meta.date}
    readingMinutes={meta.readingMinutes}
    repo={meta.repo}
    toc={TOC}
  >
    <H2 id="crowd">Sixty-four Marios, no policy</H2>

    <p>
      Sixty-four Marios are trying to get up the stairs to the top floor of Peach's castle. None of
      them has a network. Each is sampling uniformly from the same 36 combinations of stick and
      buttons, thirty times a second, and what that mostly produces is ground pounds —{' '}
      {pct(randomRef.groundPound.mean / 100, 1)} of their frames, because 18 of the 36 actions hold
      Z and 18 press A, and A pressed in the air with Z held is the ground-pound trigger. A few of
      them climb six or seven steps, touch the band the level paints across the treads, and are
      thrown back down to where they started.
    </p>

    <Clip
      n={1}
      src={MEDIA.untrained}
      loop
      wide
      caption={
        <>
          A population with no policy, sampling the 36 actions uniformly, drawn by the game's own
          renderer in the room the task lives in. The cyan band is the twelve collision triangles
          the level types as instant warps, drawn from the collision data itself. Over four rollouts
          of {num(occupancy.frames)} frames a uniform random policy reaches a best height
          of {num(randomRef.bestHeight)} — its spawn height — and a best backwards speed
          of <M>{signed(randomRef.bestPeak)}</M>. Silent.
        </>
      }
    />

    <p>
      They are not failing because the staircase is long. They are failing because it does not end.
      Standing on one of those twelve triangles displaces Mario 205 units down and 410 units back,
      once per frame, forever, and no amount of ordinary movement gets past it. Getting to the top
      of these stairs requires a bug — specifically, a sign error in a 1996 velocity clamp that lets
      a long jump taken backwards multiply Mario's speed without limit.
    </p>

    <p>
      This post is about what it costs to make an agent find that bug, and about a pattern I did not
      expect going in. I trained 24 agents on this one staircase under four rewards, from one that
      explains the goal in detail to one that says almost nothing. The more helpful the reward, the
      worse the outcome. The reward that describes the goal most sensibly — climb, get paid — is the
      only one of the four that never solves it, at {rungByName('height').solved} of{' '}
      {rungByName('height').total} seeds. The reward that says nothing except <em>you are standing
      on the landing</em> solves it. The ranking is not noise; it follows from the shape of the
      task, and the rest of this post is that argument.
    </p>

    <H2 id="exploit">The bug they have to find</H2>

    <p>
      A <strong>backwards long jump</strong> is a speed exploit: every long jump multiplies Mario's
      forward velocity by 1.5 before clamping it, and the clamp tests only the upper side, so a long
      jump taken while moving backwards multiplies a negative number without bound. The
      decompilation <Cite ids={[2]} /> carries a comment saying exactly that, and it is the reason
      speedrunners can cross the castle doors a save file has not earned <Cite ids={[1]} />:
    </p>

    <Code language="c" file="src/game/mario.c — set_mario_action_airborne, ACT_LONG_JUMP">
      {LAUNCH_CODE}
    </Code>

    <p>
      One multiplication is not enough, because the air physics pull backwards speed toward a fixed
      point. The same update that leaves forward speed alone pushes negative speed up by two units
      per airborne frame, which makes <M>-16</M> an attractor rather than a floor:
    </p>

    <Code language="c" file="src/game/mario_actions_airborne.c — update_air_without_turn">
      {BRAKE_CODE}
    </Code>

    <p>
      So a chain of long jumps is a small dynamical system. A launch at speed <M>v</M> that
      spends <M>k</M> frames in the air at decay <M>d</M> lands and relaunches
      at <M>{`v' = 1.5\\,(v - dk)`}</M>, which grows only when <M>{`|v| > 3dk`}</M>. Air time is the
      only term the level controls, and it is why the exploit needs stairs rather than a hill: a
      staircase lands Mario on the next tread almost immediately, and stair treads are flat. The
      flatness matters as much as the shortness, because the game diverts any landing with backwards
      speed on a slope into a slide, and treats anything past about 38° as a slope:
    </p>

    <Code language="c" file="src/game/mario_actions_moving.c — should_begin_sliding">{SLIDE_CODE}</Code>

    <p>
      What all that speed is <em>for</em> is one line of level logic. The check that sends Mario back
      down the stairs samples the floor he is standing on, once, at a fixed point in the frame:
    </p>

    <Code language="c" file="src/game/level_update.c — check_instant_warp">{WARP_CODE}</Code>

    <p>
      The triggering triangles span <M>{`z \\in [${escape.band.zLow}, ${escape.band.zHigh}]`}</M>,
      so the band is {escape.band.depth} units deep and the only way over it is a single frame's
      displacement larger than that. Mario's fastest legitimate movement is a long jump at the
      clamp, 48 units per frame. Nothing in the game closes the gap between 48
      and {escape.band.depth}, which is the property the whole post turns on: there is no partial
      version of this trick and nothing to climb toward. A policy either compounds a chain or sits
      at the attractor.
    </p>

    <KeyNumbers
      items={[
        { k: 'Warp band depth', v: `${escape.band.depth}`, s: 'units of z, sampled once per frame' },
        { k: 'Fastest clean movement', v: '48', s: 'units/frame, the long-jump clamp' },
        { k: 'Peak the policy reaches', v: num(Math.round(Math.abs(escape.peak))), s: `units/frame, ${overshoot.toFixed(1)}× the requirement` },
      ]}
    />

    <p>
      Here is a trained policy doing it. It holds A and Z on one frame and releases A on the next,
      because <code>INPUT_A_PRESSED</code> is an edge and never re-latches on a held button, and
      each press multiplies the magnitude by almost exactly 1.5 — the shortfall is the 2% drag paid
      on the release frame. From frame {escape.chain.start} it takes{' '}
      {escape.chain.cycles} presses to clear a band that ordinary movement cannot cross at all.
    </p>

    <Clip
      n={2}
      src={MEDIA.escape}
      wide
      caption={
        <>
          Two beats of the filmed episode at one eighth speed, each frame held for a quarter of a
          second. Frames 204–222 first: frame {escape.inPhase!.frame} warps back
          at <M>{signed(escape.inPhase!.velocity, 2)}</M>, past the {escape.band.depth} the band is
          wide, because the frame it lands on falls
          at <M>{`z = ${escape.inPhase!.from[1]}`}</M>, inside it — and
          frame {escape.clears!.frame}, at <M>{signed(escape.clears!.velocity, 2)}</M>, steps
          from <M>{`z = ${escape.clears!.from}`}</M> to <M>{`z = ${escape.clears!.to}`}</M> and
          never touches it. Then frames 548–580: the chain of Table 1, the crossing at
          frame {escape.chain.escapeFrame}, which carries Mario over the whole band in one frame so
          that the floor sample never lands on a trigger triangle, and the peak
          of <M>{signed(escape.peak, 1)}</M> at frame {escape.chain.peakFrame}. Silent, because
          audio held eight frames at a time is not audio.
          (Source: <code>results/replay_model_endless.json</code>.)
        </>
      }
    />

    <Table
      n={1}
      caption={
        <>
          Press frames of that chain, each against the frame immediately before it, which is not
          always the row above because the release frames are omitted.
          Frame {escape.chain.start} is a drag frame, included because the growth is measured
          from it, and it is a drag frame for a reason worth naming: it presses A without
          holding Z. <code>act_long_jump_land</code> discards the press
          unless <code>INPUT_Z_DOWN</code> is set, so the frame pays the ground friction —
          the {dragRatio.toFixed(2)} in its own row — where every press that holds both multiplies
          by at least {weakestAmplify.toFixed(3)}. The band spans <M>{`z \\in [${escape.band.zLow}, ${escape.band.zHigh}]`}</M>.
        </>
      }
      columns={[
        { key: 'frame', label: 'Frame', numeric: true },
        { key: 'vel', label: 'Forward velocity', numeric: true },
        { key: 'ratio', label: 'Ratio', numeric: true },
        { key: 'z', label: 'z after the frame', numeric: true },
        { key: 'state', label: 'Against the band' },
      ]}
      rows={escape.presses.map(row => ({
        frame: num(row.frame),
        vel: signed(row.velocity, 2),
        ratio: row.ratio === null ? '—' : `${row.ratio.toFixed(3)}${row.ratio < 1 ? ' (drag)' : ''}`,
        z: row.z === null ? '—' : signed(row.z, 1),
        state:
          row.crossed
            ? 'below — cleared, no warp'
            : row.z !== null && row.z > escape.band.zHigh
              ? 'above'
              : 'past',
        highlight: row.crossed,
      }))}
    />

    <p>
      Speed alone is not the condition, which took me a while to accept. Earlier in the same episode
      the policy reached <M>{signed(escape.inPhase!.velocity, 2)}</M> on
      frame {escape.inPhase!.frame} — already faster than the {escape.band.depth} it supposedly
      needs — and warped anyway, because that frame put it
      at <M>{`z = ${escape.inPhase!.from[1]}`}</M>, inside the band. Crossing means arriving in
      phase as well as arriving fast, and phase is not in the observation: the policy is told the
      floor's normal, its height and whether it is a trigger, never where the step edge is.
      Overshooting by {overshoot.toFixed(1)}× is how it buys robustness against a variable it
      cannot see.
    </p>

    <Hero
      n={3}
      caption={
        <>
          The whole episode, uncut: {escape.frames} frames,{' '}
          {(escape.frames / results.media.frameRate).toFixed(1)} seconds, spawn to the landing
          at <M>{`y = ${escape.goalY}`}</M>, with the measured state burned in. It is thrown
          back {escape.warpCount} times before the chain that works — twice while already moving
          backwards, once while walking. The chapter marks are the episode's own mechanical events,
          taken from the recorded state rather than from round numbers.
        </>
      }
    />

    <H2 id="training">How this was trained</H2>

    <p>
      Three processes, and the interesting part is that two of them are the same 1996 code reached
      different ways. The policy acts in <strong>libsm64</strong> <Cite ids={[3]} />, which compiles
      the decompilation's Mario as a shared library stepped one frame at a
      time. <strong>sm64-port</strong> <Cite ids={[4]} /> is the same game as a native binary, and it
      is used only as a renderer: it is patched to stamp recorded state onto Mario instead of
      simulating him, so a clip cannot drift from the trajectory that was measured the way an
      open-loop input replay would.
    </p>

    <Figure
      n={4}
      caption={
        <>
          The training loop and the rendering path. One libsm64 process holds one static surface
          set, so the vectorised environment runs one subprocess per environment; the crowd shots
          exploit the same static list from the other direction, giving each of 64 Marios its own
          state while they share one staircase. The two rates are worth comparing:
          one uncontended process steps at {num(speed.single)} steps/s
          and {speed.envs} of them plus the learner on {speed.machine.cores} cores manage{' '}
          {num(speed.loop)}, so the vectorisation buys PPO batched rollouts rather than throughput.
          Measured on {speed.machine.machine}, {speed.machine.cores} cores. The loop rate is
          fitted across runs of three lengths rather than timed, because
          the {speed.startupSeconds}s of spawning subprocesses and loading the ROM into each is
          otherwise charged to the stepping. (Source: <code>results/throughput.json</code>.)
        </>
      }
    >
      <Pipeline />
    </Figure>

    <Note label="Method: is the simulator the game">
      <p>
        Two checks. A file-by-file diff of every source file in the chain
        against <code>n64decomp/sm64</code> at <code>9921382a</code> found them byte identical —
        the amplifier, the air update, the air step and both landing actions. That says the code is
        right, not that the harness drives it right, so the second check replays a human artefact:
        the TASVideos 0-star run <Cite ids={[1]} />,{' '}
        {num(results.validation.movie.input_samples)} controller samples against a ROM whose SHA-1
        matches the one the movie was recorded on. It runs with no desync, and the longest backwards
        long jump chain in it — castle area 1, frames 3709 to 3739, peaking at forward
        velocity <M>{results.validation.peakReference.toFixed(2)}</M> — reproduces
        in libsm64 {results.validation.framesBitExact} of {results.validation.framesCompared} frames
        bit-identically in position, velocity and forward velocity, same action every frame, same
        peak to the last bit. Per-frame ratios span 1.4952 to 1.4996.
      </p>
      <p>
        Where it stops matters too: libsm64 has no level logic, so it cannot follow a door or an
        instant warp, and the environment therefore implements <code>check_instant_warp</code>{' '}
        itself against the level's own collision data.
      </p>
    </Note>

    <p>
      The agent sees 24 normalised floats and picks one of 36 actions, nine stick directions at full
      deflection crossed with A and Z. Two details in that are load-bearing rather than incidental.
      The last two observation dimensions are the <em>previous</em> frame's A and Z, without which
      the phase of a two-frame press cycle is not representable at all. And the action repeat is 1,
      because <code>INPUT_A_PRESSED</code> is an edge: holding A for <M>k</M> frames produces one
      press, so a repeat of <M>k</M> forces a minimum press period of <M>2k</M>. Measured with a
      scripted press cycle, period 2 peaks at <M>-715</M>, period 4 at <M>-31.6</M>, period 6
      at <M>-20.8</M>. Above a repeat of 1 the exploit is not harder to learn, it
      is <em>inexpressible</em> — nine runs confirmed that with zero successes, and filing those as
      "shaping insufficient" would have blamed the algorithm for a fact about the game's input
      handling.
    </p>

    <p>
      Every reward pays 1.0 for standing on the landing. Shaping terms are capped
      at 0.25 each, which is what makes the four variants comparable without rescaling, and both
      pay only on a new <em>record</em> rather than per frame <Cite ids={[7]} /> — the warp throws
      Mario down the stairs constantly, and a per-frame progress term would pay him forever for
      re-climbing the same six steps.
    </p>

    <Table
      n={2}
      caption="The four rewards. Six seeds each to 20M timesteps, 24 runs. Fastest discovery is the earliest timestep at which any seed of that variant reached the landing."
      columns={[
        { key: 'name', label: 'Reward' },
        { key: 'terms', label: 'Beyond the goal' },
        { key: 'ceiling', label: 'Shaping ceiling', numeric: true },
        { key: 'solved', label: 'Seeds solved', numeric: true },
        { key: 'fastest', label: 'Fastest discovery', numeric: true },
      ]}
      rows={['height', 'height_speed', 'speed', 'terminal'].map(name => {
        const rung = rungByName(name);
        const fastest = fastestIn(name);
        return {
          name: RUNG_LABEL[name],
          terms:
            name === 'terminal'
              ? 'nothing'
              : name === 'speed'
                ? 'record backwards speed'
                : name === 'height'
                  ? 'record height climbed on foot'
                  : 'both',
          ceiling: name === 'terminal' ? '0' : name === 'height_speed' ? '0.25 + 0.25' : '0.25',
          solved: `${rung.solved} / ${rung.total}`,
          fastest: fastest === null ? 'never' : millions(fastest),
          highlight: name === 'height',
        };
      })}
    />

    <Note label="The week the project was wrong">
      <p>
        Before any of this ran, the chain was believed not to reproduce at all: a scripted sweep over
        launch angles and air-stick settings had found no growth on any geometry, and I read that as
        the exploit needing frame-perfect inputs. It did not. libsm64 takes stick axes
        in <M>[-1, 1]</M> and scales them itself:
      </p>
      <Code language="c" file="src/libsm64.c:241">{STICK_CODE}</Code>
      <p>
        The sweep had passed <M>{`\\pm 64`}</M> and <M>0</M>. So it tested two useless regimes — no
        backwards drive, and a stick magnitude of 4,096 that drove forward velocity
        to <M>-6142</M> in one frame and threw Mario out of the level — and never the range between
        them, which is the only range where a chain exists. The project's central negative result
        was an input bug, and every measurement in this post postdates finding it.
      </p>
    </Note>

    <Note label="The reward that paid sixty times too much">
      The first speed term paid <M>0.01</M> per unit of record backwards speed. At a peak
      of <M>-6000</M> that is a return of about 59 against a goal worth 1.0, so the agent was paid
      roughly sixty times more for going fast than for finishing — and it learned exactly that: long
      chains, no interest in the landing. The boat farming turbo pads instead of finishing the
      race <Cite ids={[9]} />, with my own reward as the flaw being exploited <Cite ids={[8]} />.
      Bounding the term at 0.25 took that variant from 2 of 3 seeds with a fastest discovery at 3.7M
      steps to {rungByName('speed').solved} of {rungByName('speed').total} at{' '}
      {millions(earliest)}. The bound is not hygiene; it is the difference between a reward that
      points at the goal and one that points past it.
    </Note>

    <p>
      One more thing to know before the results: the environment contributes no randomness. Spawn
      jitter is zero, three different environment seeds produce identical 300-frame trajectories,
      and an identical reward and seed reproduced a 6.3M-step trajectory exactly across two cluster
      submissions on different nodes, with bit-identical weights across all 12 tensors. A seed
      controls initial weights and action sampling, nothing else. So when a variant solves 3 of 6,
      that is three independently initialised agents getting lucky on a fixed puzzle — which is why
      nothing in this post is a mean across seeds.
    </p>

    <H2 id="height">The helpful reward</H2>

    <p>
      The obvious thing to pay for is height. The goal is up; pay for getting up. It is bounded, it
      is potential-based, it never rewards anything you would not want, and on most navigation tasks
      it is exactly right. Here it is the worst of the four: {rungByName('height').solved} of{' '}
      {rungByName('height').total} seeds, against {rungByName('terminal').solved} of{' '}
      {rungByName('terminal').total} for a reward that says nothing at all.
    </p>

    <SwarmRow
      n={5}
      rung="height"
      caption={
        <>
          The height-shaped population at four checkpoints, 64 policies each, the whole{' '}
          {results.swarm.seconds}-second window the counts are taken over. Nothing changes
          across 20M timesteps: the crowd walks up, bunches on the cyan band and is thrown back,
          and no panel finishes a single episode. Best backwards velocity never
          passes <M>{signed(swarmPeak('height'), 1)}</M> in any of the four. Each panel plays
          muted; unmute one at a time.
        </>
      }
    />

    <p>
      The reason is visible in the panels and in the reward's own shape. The height term goes flat
      at <M>y = 3960</M>, because that is where the barrier is and no ordinary movement gets past
      it. So it is a smooth gradient over exactly the region where ordinary movement works, and a
      constant over the region where the exploit lives. There is no gradient across the
      discontinuity — and the discontinuity is the whole task.
    </p>

    <p>
      What the term does provide is a comfortable place to sit. All six height-shaped runs end at
      exactly {num(heightSeeds[0].episodes)} episodes, which is 20M steps divided by the 3,000-frame
      cap: every episode ran the clock out. Five of the six warp
      between {heightWarpLo.toFixed(0)} and {heightWarpHi.toFixed(0)} times per episode over their
      last 1,000; the sixth never reaches the barrier at all. Climb, collect the record, get thrown
      down, climb again and collect nothing, because the record is already set. Median best
      backwards speed across the six is <M>{signed(heightMedianPeak)}</M> — the <M>-16</M> attractor
      plus a couple of failed launches — across {num(heightEpisodes)} episodes and zero successes.
    </p>

    <p>
      The failure is also inaudible, which is worth a paragraph because it is the one diagnostic
      that needed no instrumentation. The decompilation's audio engine keeps its state in a
      file-scope global rather than per Mario, so one audio tick per frame renders the whole crowd.
      And <code>act_long_jump</code> plays <code>SOUND_MARIO_YAHOO</code> on entry, while a working
      chain re-enters that action on nearly every frame, so the obvious guess is that a policy doing
      the exploit screams continuously. It does the opposite. The chain is the quietest stretch of
      the whole run: RMS {audioPhases.chain.rms} over
      frames {audioPhases.chain.first}–{audioPhases.chain.last},
      against {audioPhases.jumpBefore.rms} for the single ordinary long jump immediately before
      it, {audioPhases.flightAfter.rms} for the flight it launches
      and {audioPhases.episode.rms} for the episode as a whole. Widening the window to the chain's
      first amplifying press at frame {audioPhases.chainFull.first} only
      reaches {audioPhases.chainFull.rms}, so the result does not depend on where the chain is said
      to begin. Put the other way round: {audioPhases.chain.presses} yells
      in {audioPhases.chain.frames} frames are quieter than one yell
      in {audioPhases.jumpBefore.frames}.
    </p>

    <p>
      Three lines of the decompilation explain that, and they are the funniest thing I found in
      it. <code>include/sounds.h</code> declares <code>SOUND_MARIO_YAHOO</code> with
      the <code>SOUND_DISCRETE</code> flag, whose own comment reads "Every call
      to <code>play_sound</code> restarts the sound". <code>set_mario_action</code> clears
      Mario's <code>MARIO_MARIO_SOUND_PLAYED</code> flag on every transition, so re-entering the
      action requests the yell again. And <code>process_sound_request</code> will not stack a
      request from a source that already holds a slot in that bank: it finds the entry by source
      pointer and, for a discrete sound, overwrites it and sets its status back to waiting. So Mario
      asks to yell {audioPhases.chain.presses} times
      in {audioPhases.chain.frames} frames, and each request restarts the sample from the top
      before the previous one has been audible. He is yelling the entire way up the staircase. You
      never hear more than the attack of any of them.
    </p>

    <p>
      The instant warp plays nothing at all either — there is no sound on
      the <code>SURFACE_INSTANT_WARP</code> path. So the trapped crowd's warps are silent too, and
      what you hear instead is 64 Marios calmly jogging up a staircase.
    </p>

    <Table
      n={3}
      caption="Audio over 30 seconds of each converged population, on the dumped 32 kHz stereo stream. Centroid is the spectral centroid; bright is the fraction of energy above 2 kHz. The mix saturates at about eight simultaneous Marios, because the engine has a fixed voice limit and drops the surplus itself, so these are not loudness-of-crowd measurements."
      columns={[
        { key: 'name', label: 'Reward' },
        { key: 'rms', label: 'RMS', numeric: true },
        { key: 'centroid', label: 'Centroid', numeric: true },
        { key: 'bright', label: 'Bright', numeric: true },
        { key: 'loud', label: 'Loud frames', numeric: true },
      ]}
      rows={RUNG_ORDER.map(name => {
        const row = mediaByRung(name);
        return {
          name: RUNG_LABEL[name],
          rms: row.audio.rms.toFixed(1),
          centroid: `${row.audio.centroid_hz.toFixed(0)} Hz`,
          bright: pct(row.audio.bands.bright),
          loud: pct(row.audio.loud_frame_fraction),
          highlight: name === 'height',
        };
      })}
    />

    <p>
      The trapped population is the loudest of the four by RMS ({trapped.audio.rms.toFixed(1)}{' '}
      against {Math.min(...escapingRms).toFixed(0)}–{Math.max(...escapingRms).toFixed(0)}) and the
      darkest by centroid ({trapped.audio.centroid_hz.toFixed(0)} Hz
      against {Math.min(...escapingCentroid).toFixed(0)}–
      {Math.max(...escapingCentroid).toFixed(0)} Hz). Band by band against the mean of the three
      escaping populations it carries {results.media.trappedOverEscapingByBand.sub.toFixed(2)}× the
      sub-bass and {results.media.trappedOverEscapingByBand.low_voice.toFixed(2)}× the low-voice
      energy, but only {results.media.trappedOverEscapingByBand.bright.toFixed(2)}× the bright
      energy. Footsteps and landings are low and broad. The yahoo is bright and periodic.
    </p>

    <H2 id="speed">The reward that points at the bug</H2>

    <p>
      Now pay for speed instead: the fraction of the escape speed the episode has reached, capped
      at 0.25. This is the one term whose gradient crosses the discontinuity, because it is defined
      against a number ordinary movement cannot approach — {escape.band.depth} units in one frame —
      and it saturates exactly when Mario is fast enough to cross rather than paying for speed
      forever. It solves {rungByName('speed').solved} of {rungByName('speed').total} seeds, fastest
      at {millions(earliest)}.
    </p>

    <SwarmRow
      n={6}
      rung="speed"
      caption={
        <>
          Speed shaping at four checkpoints, 64 policies each, and it improves left to
          right: {solvedAt('speed').join(' / ')} episodes finished. By 20M the crowd crouches,
          launches backwards and goes over the band rather than into it, its fastest Mario
          reaching <M>{signed(swarmPeakAt('speed', -1), 1)}</M>. What improves is the count and not
          the speed: the four panels peak
          at {swarmManifest.rungs.speed.map(row => signed(row.peakBackward, 1)).join(', ')}, which
          does not trend, because a panel's peak is the single fastest of 64 policies and one
          runaway chain moves it. Unmute one panel and the striking thing is how little there is to
          hear: a chain re-enters <code>ACT_LONG_JUMP</code> on nearly every frame and is quieter
          than the crowd walking.
        </>
      }
    />

    <p>
      Height shaping rewards the thing you want. Speed shaping rewards the thing that gets it. The
      distinction is not about density or boundedness — both terms are dense and both are capped at
      0.25 — it is about whether the gradient survives the point where ordinary movement stops
      working.
    </p>

    <H2 id="curves">Reward against steps</H2>

    <p>
      Four rungs, one axis, {num(results.totals.episodes)} episodes:
    </p>

    <Figure
      n={7}
      caption={`Median episode return across six seeds per reward, binned at ${results.curveBin / 1000}k timesteps. The four curves are not on a common scale: a seed that has the exploit scores 1.0 for the landing plus whatever its shaping terms are worth, so a solver plateaus at ${modeOf('terminal', 'solved')} on landing-only, ${modeOf('speed', 'solved')} on speed and ${modeOf('height_speed', 'solved')} on both. Return is also bimodal rather than continuous — a seed either has the exploit or does not — so the median reports which side of three seeds the population fell on and not a level anybody reached: speed at ${solvedIn('speed').length} of 6 sits on its solving mode, height and speed at ${solvedIn('height_speed').length} of 6 sits at ${plateau('height_speed')}, between its modes of ${modeOf('height_speed', 'solved')} and ${modeOf('height_speed', 'never')} and describing neither, and landing-only at ${solvedIn('terminal').length} of 6 stays flat at zero because a median cannot show a minority.`}
    >
      <LineChart
        title="Median return by reward"
        sub="median across 6 seeds · 250k-step bins"
        xLabel="timesteps"
        yLabel="episode return"
        xTicks={X_TICKS}
        series={RETURN_SERIES}
        unit=""
        footer="results/curves_page.json"
      />
    </Figure>

    <p>
      One comparison in that figure carries the argument of the whole post. For
      all {results.heightOverTerminal.bins} bins of the run, the height curve sits above the
      landing-only curve — {plateau('height')} against zero at the end — and yet height is the
      variant that never once reaches the landing, and landing-only is the variant that does. What
      the height curve reports is its shaping term paying out for climbing, which is progress up
      the stairs rather than progress on the task. The reward that looks like it is working is the
      one that never works.
    </p>

    <p>
      Which is exactly why the discovery step needs its own figure. Every run's first success is a
      single timestep, and the distribution of those is the real result of the ladder:
    </p>

    <Figure
      n={8}
      caption="Timestep at which each run first reached the landing, sorted. Coloured bars are the ten runs that found the exploit; muted bars are the fourteen that never did, drawn at the 20M ceiling and labelled on hover with the best backwards speed that run reached."
    >
      <BarChart
        title="First success per run"
        sub="24 runs · 4 rewards × 6 seeds · 20M timesteps each"
        unit="timesteps"
        data={DISCOVERY_BARS}
        labelWidth={132}
        footer="results/episode_stats.json"
      />
    </Figure>

    <p>
      {discovered.length} of 24 runs found it. Within speed shaping — the variant that always worked
      — the fastest seed discovered the exploit at {millions(earliest)} and the slowest
      at {millions(latest)}, a spread of {spread.toFixed(1)}× on identical hyperparameters,
      identical geometry and an environment with no randomness in it. Reporting{' '}
      {millions(Math.round(speedDiscovered.reduce((sum, seed) => sum + seed.firstSuccess!, 0) / speedDiscovered.length))}{' '}
      as the average discovery time would describe none of the six runs and would hide that two of
      them spent more than 16M steps finding what another found in {millions(earliest)}. Outcomes
      here bifurcate rather than cluster, and the summary statistic that survives contact with that
      is seeds solved out of six <Cite ids={[10]} />.
    </p>

    <p>
      Across all {stalled.length} runs that never discovered it, the best backwards speed any of
      them reached was <M>{signed(stalledBestPeak)}</M> against a threshold
      of {results.escapeSpeed}. One height-shaped seed got
      to {pct(Math.abs(stalledBestPeak) / results.escapeSpeed, 0)} of what it needed and never
      crossed; the other {stalled.length - 1} never exceeded <M>{signed(stalledSecondPeak)}</M>.
      That is what a threshold with no gradient across it looks like from below. Ninety-five per cent
      of the required speed buys nothing at all.
    </p>

    <H2 id="silence">Saying nothing at all</H2>

    <p>
      Which leaves the two rewards that are not trying to be helpful in the same way. Adding speed
      back on top of height recovers most of what height destroyed —{' '}
      {rungByName('height_speed').solved} of {rungByName('height_speed').total}, fastest
      at {millions(fastestIn('height_speed')!)} — and paying nothing but the goal
      solves {rungByName('terminal').solved} of {rungByName('terminal').total}, at{' '}
      {millions(terminalSolver.firstSuccess)}.
    </p>

    <SwarmRow
      n={9}
      rung="terminal"
      caption={
        <>
          Landing only: 1.0 for standing on the top landing and nothing else.{' '}
          {solvedAt('terminal').join(' / ')} episodes finished across the four checkpoints, so
          discovery happens on camera between 5M and 10M — the crowd goes from thrashing on the
          bottom steps to clearing the band in one gap between panels.
        </>
      }
    />

    <SwarmRow
      n={10}
      rung="height_speed"
      caption={
        <>
          Both terms together: {solvedAt('height_speed').join(' / ')} episodes finished. The speed
          term restores the gradient that height alone destroys, and the pair lands
          at {rungByName('height_speed').solved} of {rungByName('height_speed').total} rather
          than {rungByName('speed').solved} of {rungByName('speed').total} — the help that height
          offers is not free even when something else is pointing across the barrier.
        </>
      }
    />

    <p>
      So the ranking of the four rewards is the reverse of how helpful they are, and the landing-only
      result is the one that needs explaining. Its episode returns take only the values 0.0 and 1.0
      across all {num(terminalSolver.episodes)} episodes of the seed that solved it. Before step{' '}
      {num(terminalSolver.firstSuccess!)} that reward had paid out exactly zero, every episode, for
      six million frames. What was the optimiser doing?
    </p>

    <p>
      Not sitting still. <code>scripts/action_occupancy.py</code> rolls out{' '}
      {occupancy.rollouts} × {num(occupancy.frames)} frames from each of 41 checkpoints of that run
      and measures where the frames go.
    </p>

    <Figure
      n={11}
      caption={`Share of frames in the ground-pound actions and in ACT_LONG_JUMP across 41 checkpoints of the landing-only run, seed ${terminalSolver.seed}. Four rollouts of 1,500 frames each. The measured first success is 6,324,840 timesteps, between the 6.0M and 6.5M checkpoints.`}
    >
      <LineChart
        title="Where the frames go"
        sub={`landing only, seed ${terminalSolver.seed} · 4 × 1500 frames per checkpoint`}
        xLabel="timesteps"
        yLabel="% of frames"
        xTicks={X_TICKS}
        series={OCCUPANCY_SERIES}
        unit="%"
        footer="results/action_occupancy.json"
      />
    </Figure>

    <Table
      n={4}
      caption={
        <>
          The same run at five checkpoints, with two null policies for scale. Mean
          over {occupancy.rollouts} rollouts, range in brackets. The {ckpt(relapse.steps)} row is
          the last checkpoint before the first success. (Source:{' '}
          <code>results/action_occupancy.json</code>.)
        </>
      }
      columns={[
        { key: 'policy', label: 'Policy' },
        { key: 'gp', label: 'Ground pound', numeric: true },
        { key: 'lj', label: 'Long jump', numeric: true },
        { key: 'peak', label: 'Median peak backward', numeric: true },
        { key: 'solved', label: 'Episodes solved', numeric: true },
      ]}
      rows={[
        { policy: 'uniform random', row: randomRef },
        { policy: 'untrained network', row: untrainedRef },
        { policy: `${ckpt(early.steps)} checkpoint`, row: early },
        { policy: `${ckpt(rising.steps)} checkpoint`, row: rising },
        { policy: `${ckpt(relapse.steps)} checkpoint`, row: relapse, highlight: true },
        { policy: `${ckpt(breakthrough.steps)} checkpoint`, row: breakthrough },
        { policy: `${ckpt(converged.steps)} checkpoint`, row: converged },
      ].map(entry => ({
        policy: entry.policy,
        gp: `${entry.row.groundPound.mean.toFixed(1)}% (${entry.row.groundPound.min.toFixed(1)}–${entry.row.groundPound.max.toFixed(1)})`,
        lj: `${entry.row.longJump.mean.toFixed(1)}% (${entry.row.longJump.min.toFixed(1)}–${entry.row.longJump.max.toFixed(1)})`,
        peak: signed(entry.row.medianPeak),
        solved: `${entry.row.successes} of ${entry.row.episodes}`,
        highlight: entry.highlight,
      }))}
    />

    <p>
      The walk between those checkpoints is large and not monotone. At {ckpt(early.steps)} the policy
      is indistinguishable from uniform random: {early.groundPound.mean.toFixed(1)}% of its frames
      are in the ground-pound actions
      against {randomRef.groundPound.mean.toFixed(1)}% for uniform random, a gap smaller than
      the {early.groundPound.min.toFixed(1)}–{early.groundPound.max.toFixed(1)}% spread its own four
      rollouts cover. Then 3.5M
      and 5.0M already spend 8% and 22% of their frames in long jump, one 4.0M rollout spends 62%,
      5.5M is back to 0.0%, {ckpt(rising.steps)} holds {rising.longJump.mean.toFixed(1)}% and reaches
      a best backwards speed of <M>{signed(rising.bestPeak)}</M> while still solving nothing — and
      then {ckpt(relapse.steps)}, the last checkpoint before the first success, has reverted
      to {relapse.groundPound.mean.toFixed(1)}% ground pound
      and {relapse.longJump.mean.toFixed(1)}% long jump. Further into the attractor than uniform
      random ever goes.
    </p>

    <p>
      No reward is not the same as no gradient. With every return exactly 0.0 the advantage of a
      state is <M>{`0 - V(s)`}</M>, and <M>V</M> is a randomly initialised network being dragged
      toward zero, so the advantages are nonzero, meaningless and correlated across a rollout.
      Episodes also end by truncation at 3,000 frames, where the value target bootstraps
      on <M>{`V(s_T)`}</M> at <M>{`\\gamma = 0.999`}</M> rather than on a terminal zero, which keeps
      feeding the same noise back in. So PPO spends six million frames on a random walk through
      policy space, driven by its own critic's initialisation and spread by the entropy
      bonus <Cite ids={[5]} />. The walk passes near the exploit repeatedly and wanders off again.
    </p>

    <p>
      That is the mechanism behind the whole ranking. The landing-only reward does not help, but it
      does not lie either: it leaves the walk free, and the walk eventually lands a success inside a
      rollout, at which point the advantage means something and the transition takes 0.5M
      frames — {ckpt(relapse.steps)} solves nothing, 6.5M solves one episode in four
      rollouts, {ckpt(breakthrough.steps)} solves {breakthrough.successes}, and from 7.5M on no
      checkpoint averages more than 10% ground pound again. The height term, by contrast, replaces the walk with a hill to
      stand on. It converts an undirected search into a directed one, and points it at the one place
      the answer is not.
    </p>

    <p>
      The moment of discovery is even audible, which is the last thing I expected to be able to
      measure. Taking a {results.media.excerpt.seconds}-second excerpt
      from {results.media.excerpt.startSeconds} seconds into each checkpoint's capture gives a level
      drop of {pct(levelDrop, 0)} — {preLevel.toFixed(0)} before
      against {postLevel.toFixed(0)} after — at the boundary between the 6M and 7M checkpoints,
      where the training log independently puts that run's first success. Flailing is loud. The
      exploit is quiet.
    </p>

    <Figure
      n={12}
      caption={`Output level of a three-second excerpt from each of ${progression.length} checkpoints of the landing-only run, seed ${terminalSolver.seed}. The step between the 6M and 7M checkpoints brackets that run's first success at 6.32M timesteps, which was measured from the training log rather than from the audio.`}
    >
      <LineChart
        title="Output level across training"
        sub={`landing only, seed ${terminalSolver.seed} · 3 s excerpt from 8 s into each capture`}
        xLabel="timesteps"
        yLabel="RMS"
        xTicks={X_TICKS}
        series={RMS_SERIES}
        unit=""
        footer="results/media_summary.json"
      />
    </Figure>

    <H2 id="limits">What this does not show</H2>

    <p>
      The headline rests on one run. A single seed of six discovered the exploit under the
      landing-only reward, and six seeds is thin for an outcome that
      bifurcates <Cite ids={[10]} />. What I would defend is the direction of the
      comparison — {rungByName('height').solved} against {rungByName('terminal').solved}, with the
      mechanism visible in the per-episode warp counts rather than inferred from an aggregate — and
      the {spread.toFixed(1)}× spread within the variant that always worked. I would not
      defend {millions(terminalSolver.firstSuccess)} as an estimate of anything.
    </p>

    <p>
      The observation is partial in a way that matters for the central number. The escape condition
      depends on where in the band Mario arrives and the policy cannot see that, so
      "{overshoot.toFixed(1)}× the threshold speed" is a statement about this observation space
      rather than about the exploit.
    </p>

    <p>
      Two controls are missing. Rebuilding libsm64 with <code>-DVERSION_SH</code> to compile
      Nintendo's own fix — the Shindou release zeroes negative speed on landing, comment and all —
      would be the ground-truth negative control, and it does not build, so the claim that this
      bug is what the agent found rests on the diff and the TAS replay instead. And a curriculum
      reward that paid 0.25 per stage of a hand-written recipe was cut for being too helpful in the
      other direction: it was the first variant to work, 2 of 3 seeds with a first success near 300k
      steps, roughly 21 times faster than paying nothing. It names the method rather than the goal,
      so succeeding at it says only that the answer was supplied. Its runs are kept as the upper
      bound on how much help is possible.
    </p>

    <p>
      And this is one staircase in one level of one game, with a standard PPO
      baseline <Cite ids={[5, 6]} /> in a Gymnasium environment <Cite ids={[12]} />. Nothing here is
      a claim about sample efficiency against methods built for hard exploration; Go-Explore's
      archive <Cite ids={[11]} /> exists precisely because undirected search is bad at discrete
      discoveries like this one, and a fair comparison would need the same environment, the same
      budget and the same seed protocol. What this measures is what a reward costs when the thing it
      is describing sits on the far side of a wall, and that the most helpful-sounding description is
      the most expensive one.
    </p>

    <References refs={BLJ_REFS} bibtex={BLJ_BIBTEX} />
  </Article>
);

export default BlogMario;
