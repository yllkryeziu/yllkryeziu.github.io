import React from 'react';
import Article, { H2, H3, Note } from './post/Article';
import Figure from './post/Figure';
import SpeedEvolution from './post/SpeedEvolution';
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
  { id: 'crowd', label: 'Sixty-four Marios, no training' },
  { id: 'exploit', label: 'How the backwards long jump works' },
  { id: 'experiment', label: 'The experiment' },
  { id: 'rewards', label: 'Which rewards worked?' },
  { id: 'silence', label: 'Learning with only a landing reward' },
  { id: 'mistakes', label: 'Three mistakes in the setup' },
  { id: 'validation', label: 'Checking the simulation' },
  { id: 'limits', label: 'What I can conclude' },
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

const rungByName = (name: string) => results.rungs.find(rung => rung.name === name)!;
const seedsOf = (name: string) =>
  results.seeds.filter(seed => seed.rung === name).slice().sort((a, b) => {
    if (a.firstSuccess === null) return 1;
    if (b.firstSuccess === null) return -1;
    return a.firstSuccess - b.firstSuccess;
  });
const solvedIn = (name: string) => seedsOf(name).filter(seed => seed.firstSuccess !== null);

const fastestIn = (name: string) => {
  const solved = solvedIn(name);
  return solved.length ? Math.min(...solved.map(seed => seed.firstSuccess!)) : null;
};

const escape = results.escape;
const speed = results.speed;
const occupancy = results.occupancy;

const speedDiscovered = solvedIn('speed');
const earliest = Math.min(...speedDiscovered.map(seed => seed.firstSuccess!));
const latest = Math.max(...speedDiscovered.map(seed => seed.firstSuccess!));
const spread = latest / earliest;
const terminalSolver = results.seeds.find(
  seed => seed.rung === 'terminal' && seed.firstSuccess !== null,
)!;
const discovered = results.seeds.filter(seed => seed.firstSuccess !== null);
const heightSeeds = seedsOf('height');
const heightEpisodes = heightSeeds.reduce((sum, seed) => sum + seed.episodes, 0);
const heightWarps = heightSeeds.map(seed => seed.warps).filter(warps => warps > 0);
const heightWarpLo = Math.min(...heightWarps);
const heightWarpHi = Math.max(...heightWarps);

const atStep = (target: number) =>
  occupancy.checkpoints.reduce((best, row) =>
    Math.abs(row.steps - target) < Math.abs(best.steps - target) ? row : best);
const rising = atStep(6e6);
const relapse = atStep(6.3e6);
const breakthrough = atStep(7e6);

const X_TICKS = [0, 5e6, 10e6, 15e6, 20e6].map(v => ({ v, label: `${v / 1e6}M` }));

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

const DISCOVERY_BARS = results.seeds
  .slice()
  .sort((a, b) => {
    const av = a.firstSuccess ?? Infinity;
    const bv = b.firstSuccess ?? Infinity;
    if (av !== bv) return av - bv;
    return a.rung.localeCompare(b.rung);
  })
  .map(seed => ({
    label: `${RUNG_LABEL[seed.rung]} · s${seed.seed}${seed.firstSuccess === null ? ' *' : ''}`,
    value: seed.firstSuccess ?? results.totals.maxTimesteps,
    display: seed.firstSuccess === null ? '≥20M *' : millions(seed.firstSuccess),
    subject: seed.firstSuccess !== null,
    note: seed.firstSuccess === null ? `No success by 20M timesteps; peak backward velocity ${signed(seed.bestPeak)}` : undefined,
  }));

const LAUNCH_CODE = `//! (BLJ's) This properly handles long jumps from getting forward speed with
//  too much velocity, but misses backwards longs allowing high negative speeds.
if ((m->forwardVel *= 1.5f) > 48.0f) {
    m->forwardVel = 48.0f;
}`;

const STICK_CODE = `gController.stickX = -64.0f * inputs->stickX;
gController.stickY = 64.0f * inputs->stickY;`;

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

// Original capture counts include 45 warmup frames plus 450 filmed frames. Copies reset after
// escaping; these are completed episodes, not percentages or a count of distinct successful Marios.
const swarmManifest = results.swarm as {
  solved: Record<string, number[]>;
  rungs: Record<string, { label: string; peakBackward: number }[]>;
};
const solvedAt = (rung: string): number[] => swarmManifest.solved[rung];
// Fastest backwards frame any of a rung's four filmed populations reached, which is the
// caption's claim about what the reader is watching rather than a claim about training.
const swarmPeak = (rung: string): number =>
  Math.min(...swarmManifest.rungs[rung].map(row => row.peakBackward));
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

// Four checkpoints of one training run, with 64 policy copies per panel. They autoplay muted, because four game audio
// streams at once is noise; one panel at a time can be unmuted, and unmuting one mutes the rest.
const SwarmRow: React.FC<{ n: number; rung: string; caption: React.ReactNode }> = ({ n, rung, caption }) => {
  const [audible, setAudible] = React.useState<string | null>(null);
  const counts = solvedAt(rung);
  return (
    <Figure n={n} caption={<>{caption}{' '}Counts include the 1.5-second warmup before each clip.</>}>
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

// Sixteen panels at 960×720 are far too heavy to fetch eagerly, so a panel carries no source at
// all until it comes within 400 px of the viewport, and pauses when it leaves again — the loop
// resumes on the way back in. The autoplay attribute alone would start the download at DOM
// insertion, which is the whole page weight before anyone scrolls.
const SwarmPanel: React.FC<{ path: string; muted: boolean }> = ({ path, muted }) => {
  const available = useAvailable(path);
  const video = React.useRef<HTMLVideoElement>(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const element = video.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNear(true);
            void element.play().catch(() => {});
          } else {
            element.pause();
          }
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [available]);
  if (available === false) return <Missing src={path} />;
  return (
    <video
      ref={video}
      src={near ? path : undefined}
      muted={muted}
      loop
      autoPlay
      playsInline
      preload="none"
      style={{ width: '100%' }}
    />
  );
};

// The hero run, with chapter marks taken from the episode's own mechanical events rather than from
// round numbers: the three warps, the launch, the crossing, the peak, the landing.
const warpLabel = (velocity: number) => {
  if (velocity >= 0) return 'Warped back while walking';
  if (Math.abs(velocity) > results.escapeSpeed) {
    return `Warped back at ${signed(velocity, 1)} — faster than the band is wide`;
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
    <rect x={x} y={y} width={w} height={h} rx="2" fill={SOFT} stroke={stroke} strokeWidth="1.2" />
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
    title={meta.title}
    date={meta.date}
    readingMinutes={meta.readingMinutes}
    repo={meta.repo}
    toc={TOC}
  >
    <H2 id="crowd">Sixty-four Marios, no training</H2>

    <p>
      These Marios share a randomly initialised neural network. They spend most of their time
      ground-pounding, occasionally manage a long jump, and get nowhere near the top of the
      stairs. The network has not received a single training update.
    </p>

    <Clip
      n={1}
      src={MEDIA.untrained}
      loop
      wide
      caption={
        <>
          Sixty-four copies of the untrained landing-only policy, seed 2. The cyan band marks the
          collision surfaces that send Mario back down the stairs. The clip loops without sound.
        </>
      }
    />

    <p>
      I wanted to see whether reinforcement learning could discover the backwards long jump on
      this staircase, and how much guidance it would need. I trained 24 agents with four different
      rewards. All six agents rewarded for backward speed reached the landing; none of the six
      rewarded for height did. One agent found the exploit with only a reward for finishing.
    </p>

    <p>
      That last result was the surprise that kept me investigating. But one success in six is
      little evidence that a landing-only reward is better than rewarding height. The clearer
      comparison is speed against height, and the recordings help explain why those rewards
      led to different behavior.
    </p>

    <H2 id="exploit">How the backwards long jump works</H2>

    <p>
      Below seventy stars, the endless staircase sends Mario back down whenever he reaches a
      band of trigger surfaces. Walking up it cannot reach the landing. A backwards long jump
      can build enough speed to skip the band between two checks.
    </p>

    <p>
      The bug is in the long-jump launch code <Cite ids={[2]} />. It multiplies forward velocity
      by 1.5, then caps positive velocity at 48. Backward motion has a negative velocity, so the
      cap never applies:
    </p>

    <Code language="c" file="src/game/mario.c — set_mario_action_airborne, ACT_LONG_JUMP">
      {LAUNCH_CODE}
    </Code>

    <p>
      Repeating the jump can keep multiplying backward speed. There is a catch: speed decays
      between launches. Stairs let Mario land and jump again quickly enough for the multiplication
      to outweigh that decay. The agent also has to release A between presses; holding it down
      does not trigger another jump.
    </p>

    <p>
      The trigger band is {escape.band.depth} units deep. The level checks the floor under Mario
      once per frame, so a sufficiently large displacement can carry him across without sampling
      a trigger surface. Speed alone does not guarantee a crossing: he can still land inside
      the band and be sent back. The position and direction of the jump matter too.
    </p>

    <Hero
      n={2}
      caption={
        <>
          A trained policy reaching the landing in {(escape.frames / results.media.frameRate).toFixed(1)}{' '}
          seconds. It is warped back {escape.warpCount} times before finishing. The state readout
          and chapter marks come from the recorded trajectory.
        </>
      }
    />

    <H2 id="experiment">The experiment</H2>

    <p>
      I used PPO <Cite ids={[5, 6]} /> with a 256×256 multilayer perceptron in a Gymnasium
      environment <Cite ids={[12]} />. The physics come from libsm64 <Cite ids={[3]} />, a library
      built from the game's decompilation. Every run starts on the same staircase and has a
      budget of 20 million timesteps, with one timestep per game frame.
    </p>

    <p>
      The agent observes 24 normalised values and chooses from 36 actions: nine stick settings
      combined with the four A/Z button combinations. The observation includes the previous
      frame's buttons, which lets the network distinguish a press from a held button. It gets a
      new action every frame. Episodes end at the landing or after 3,000 frames.
    </p>

    <p>
      All four rewards pay 1.0 for reaching the top landing. Two optional shaping terms reward
      new records in height climbed on foot or backward speed, each capped at 0.25 per episode.
      Paying only for a new record prevents the agent from collecting the same height reward
      every time the staircase sends it back down.
    </p>

    <Table
      n={1}
      caption="Four rewards, six seeds each. A seed counts as solved if it reached the landing at least once within 20M timesteps. Fastest discovery is the earliest success among that reward's six runs."
      columns={[
        { key: 'name', label: 'Reward' },
        { key: 'terms', label: 'Beyond the landing reward' },
        { key: 'ceiling', label: 'Shaping cap', numeric: true },
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
              ? 'none'
              : name === 'speed'
                ? 'record backward speed'
                : name === 'height'
                  ? 'record height climbed on foot'
                  : 'both records',
          ceiling: name === 'terminal' ? '0' : name === 'height_speed' ? '0.25 + 0.25' : '0.25',
          solved: `${rung.solved} / ${rung.total}`,
          fastest: fastest === null ? '—' : millions(fastest),
          highlight: name === 'speed',
        };
      })}
    />

    <p>
      Training uses a fixed spawn and deterministic physics. Seeds change the initial weights
      and action sampling. The crowd videos below show 64 copies of a single checkpoint policy
      sampling actions independently, with spread-out starts for visibility. They illustrate
      behavior within one run; the six independent training runs are the basis of the comparison.
    </p>

    <H2 id="rewards">Which rewards worked?</H2>

    <p>
      {discovered.length} of the 24 runs reached the landing. Even within speed shaping, where
      all six succeeded, first discovery ranged from {millions(earliest)} to {millions(latest)}{' '}
      timesteps, a {spread.toFixed(1)}× spread. The individual runs show how much an average
      would conceal <Cite ids={[10]} />:
    </p>

    <Figure
      n={3}
      caption="First success for each training run. Grey bars marked * mean no success by the 20M budget; their endpoints are the cutoff, not observed discovery times."
    >
      <BarChart
        title="First success per run"
        sub="24 runs · 4 rewards × 6 seeds · * no success by 20M timesteps"
        unit="timesteps"
        data={DISCOVERY_BARS}
        labelWidth={154}
        footer="results/episode_stats.json"
      />
    </Figure>

    <H3 id="helpful">Height rewarded climbing, without producing an escape</H3>

    <p>
      Height seemed a reasonable starting point: the landing is above the spawn, so reward
      movement toward it. The policies learned to climb. Five of the six ended up repeatedly
      reaching the trigger band and being sent back; the sixth did not reach the barrier.
    </p>

    <SwarmRow
      n={4}
      rung="height"
      caption={
        <>
          Height reward at 1M, 5M, 10M and 20M timesteps. No copy reaches the landing during
          these {results.swarm.seconds}-second captures; the fastest backward velocity across
          the four panels is <M>{signed(swarmPeak('height'))}</M>.
        </>
      }
    />

    <p>
      All six runs used their full episode budgets: {num(heightEpisodes)} episodes, all ending
      at the time limit. Over their last 1,000 episodes, the five policies reaching the band
      averaged {heightWarpLo.toFixed(0)}–{heightWarpHi.toFixed(0)} warps per episode. Their
      height reward had already paid out by the first visit, so returning to the band earned
      nothing more.
    </p>

    <p>
      The height reward provides feedback for ordinary climbing but none for building a jump
      chain below the barrier. The recordings are consistent with that early reward favoring
      climbing over the movements needed to discover the exploit. They do not establish that
      every height-based reward would fail, or that these policies could never escape with more
      training.
    </p>

    <H3 id="mechanism">Backward speed provided useful intermediate rewards</H3>

    <p>
      Speed shaping rewards increases in record backward speed, up to a target
      of {results.escapeSpeed} units per frame and a total payment of 0.25. A developing chain
      can earn this reward before Mario crosses the band. The target is based on the band's
      width; it is a proxy for a crossing, not a guarantee of one.
    </p>

    <SpeedEvolution />

    <p>
      This reward produced successes in {rungByName('speed').solved} of{' '}
      {rungByName('speed').total} seeds. Adding height to it produced successes in{' '}
      {rungByName('height_speed').solved} of {rungByName('height_speed').total}. That difference
      suggests the height term may interfere with learning, but six seeds per condition leave
      considerable uncertainty about its size.
    </p>

    <SwarmRow
      n={6}
      rung="height_speed"
      caption={
        <>
          Height and speed together, for a run that succeeded. The four captures
          record {solvedAt('height_speed').join(', ')} escapes including warmup. Three of this reward's six
          training runs found the exploit.
        </>
      }
    />

    <p>
      I compare rewards using landing events rather than episode return. Each variant pays
      different shaping bonuses, so a higher return can simply mean more bonus collected.
      The height-only agents earned reward without ever finishing. The landing-only median
      would hide its one successful seed entirely.
    </p>

    <H2 id="silence">Learning with only a landing reward</H2>

    <p>
      The landing-only reward produced one successful run, seed {terminalSolver.seed}, at{' '}
      {millions(terminalSolver.firstSuccess)} timesteps. Until then, every training episode had
      returned zero. I looked at saved checkpoints to see how the policy had changed before
      receiving any task reward.
    </p>

    <SwarmRow
      n={7}
      rung="terminal"
      caption={
        <>
          The successful landing-only run. The 1M and 5M captures contain no escapes;
          the 10M and 20M captures contain {solvedAt('terminal')[2]} and{' '}
          {solvedAt('terminal')[3]}. The training log records the first success between 6M and 7M.
        </>
      }
    />

    <Figure
      n={8}
      caption={`Action occupancy at ${occupancy.checkpoints.length} checkpoints of landing-only seed ${terminalSolver.seed}, measured over ${occupancy.rollouts} rollouts of ${num(occupancy.frames)} frames each. First training success was at ${millions(terminalSolver.firstSuccess)} timesteps.`}
    >
      <LineChart
        title="Actions before and after the first reward"
        sub={`landing only, seed ${terminalSolver.seed} · ${occupancy.rollouts} × ${occupancy.frames} frames per checkpoint`}
        xLabel="timesteps"
        yLabel="% of frames"
        xTicks={X_TICKS}
        series={OCCUPANCY_SERIES}
        unit="%"
        footer="results/action_occupancy.json"
      />
    </Figure>

    <p>
      The policy's behavior changed substantially before success, without improving steadily.
      At {ckpt(rising.steps)}, it spent {rising.longJump.mean.toFixed(1)}% of frames long-jumping
      but solved nothing. At {ckpt(relapse.steps)}, the last checkpoint before discovery, it was
      back to {relapse.groundPound.mean.toFixed(1)}% ground-pounding. By{' '}
      {ckpt(breakthrough.steps)}, the evaluation rollouts recorded {breakthrough.successes}{' '}
      completed episodes.
    </p>

    <p>
      PPO can still update a policy when task rewards are zero. Value estimates and the entropy
      bonus are plausible sources of the changes here; bootstrapping at the episode time limit
      may also matter. I did not run ablations that isolate those effects, so the occupancy plot
      shows the changing behavior, not a demonstrated explanation for it. This one run shows
      that the exploit was discoverable without an intermediate reward in this setup. It does
      not make landing-only training reliable: the other five seeds never finished.
    </p>

    <H2 id="mistakes">Three mistakes in the setup</H2>

    <p>
      Before running the reward comparison, I had to fix an input bug, an oversized reward and
      an action-timing problem. Each changed what the experiment appeared to say about PPO.
    </p>

    <H3>Passing controller values in the wrong units</H3>

    <p>
      My first scripted sweep found no sustained acceleration, and I thought the exploit might
      require inputs too precise for a policy to find. The sweep was passing stick values
      of <M>{`\pm 64`}</M> to libsm64. The library expects <M>[-1, 1]</M> and applies its own scaling <Cite ids={[3]} />:
    </p>

    <Code language="c" file="src/libsm64.c:241">{STICK_CODE}</Code>

    <p>
      I had tested neutral input and an effective stick magnitude of 4,096, skipping the intended
      range. The latter could throw Mario out of the level in one frame. The apparent failure
      to reproduce the exploit was an input bug. All results above come after that fix; the
      scripted controls now use the same input path as the policy.
    </p>

    <H3>Paying more for speed than for finishing</H3>

    <p>
      The first speed reward paid 0.01 per unit of record backward speed without a cap. Around
      a speed of −6000, that was roughly 60 reward against 1.0 for reaching the landing. Agents
      learned long chains without reliably finishing, much like the reward-farming behavior in
      CoastRunners <Cite ids={[8, 9]} />.
    </p>

    <p>
      Capping the speed bonus at 0.25 kept the landing worth more than all of the speed reward.
      The preliminary uncapped version had solved 2 of 3 seeds; the capped version solved
      6 of 6. Those small batches are not a precise estimate of the improvement, but they
      prompted the bounded rewards used throughout the main comparison.
    </p>

    <H3>Holding actions for too many frames</H3>

    <p>
      Holding A does not produce repeated presses. An action repeat of <M>k</M> frames forces
      at least <M>2k</M> frames between presses, because A must be released and pressed again.
      In the scripted timing test, a two-frame cycle reached −715, a four-frame cycle −31.6,
      and a six-frame cycle −20.8. The slower cycles lost too much speed between launches.
    </p>

    <p>
      Nine training runs with action repeats of 2, 4 and 6 produced no successes. That does
      not prove no longer-period controller could ever work, but it was enough reason to use
      one action per frame for the reward comparison. Otherwise, a failed run could reflect
      restricted input timing as well as a failure to learn.
    </p>

    <H2 id="validation">Checking the simulation</H2>

    <p>
      The policy acts in libsm64. A separate program, sm64-port <Cite ids={[4]} />, renders the
      recorded states. It is patched to place Mario at each measured state, so rendering does
      not depend on replaying the inputs and reproducing the trajectory a second time.
    </p>

    <Figure
      n={9}
      caption={`The training and rendering paths. On the ${speed.machine.cores}-core ${speed.machine.machine} machine, a single environment steps at ${num(speed.single)} frames/s; ${speed.envs} environments plus PPO manage ${num(speed.loop)} timesteps/s. Source: results/throughput.json.`}
    >
      <Pipeline />
    </Figure>

    <Note label="How closely does libsm64 match the game?">
      In my comparison of the longest castle-area-1 jump chain from TASVideos movie 2016M{' '}
      <Cite ids={[1]} />, position and velocity match bit-for-bit in{' '}
      {results.validation.framesBitExact} of {results.validation.framesCompared} frames, with
      the same action sequence. The comparison aligns the camera-relative input direction
      to the reference on every frame. Other chains show small numerical differences, and
      a basement chain diverges at a level transition <Cite ids={[13]} />.
      This checks a specific movement sequence, not every part of the level:
      libsm64 lacks doors and instant warps, so the environment implements the staircase's
      warp check using the level's collision data.
    </Note>

    <H3>Checking a crossing frame by frame</H3>

    <p>
      In the filmed episode, frame {escape.inPhase!.frame} has a backward velocity
      of <M>{signed(escape.inPhase!.velocity, 2)}</M>, yet Mario is warped back because his
      sampled position, <M>{`z = ${escape.inPhase!.from[1]}`}</M>, is inside the band. On
      frame {escape.clears!.frame}, he steps from <M>{`z = ${escape.clears!.from}`}</M> to{' '}
      <M>{`z = ${escape.clears!.to}`}</M> and skips it. That is why I use landing events to
      measure success rather than a speed threshold alone.
    </p>

    <Clip
      n={10}
      src={MEDIA.escape}
      wide
      caption={
        <>
          Two excerpts at one eighth speed, without audio. The first shows a warp and a later
          crossing; the second shows the final jump chain, crossing at
          frame {escape.chain.escapeFrame} and peaking at <M>{signed(escape.peak)}</M> on
          frame {escape.chain.peakFrame}. Source: results/replay_model_endless.json.
        </>
      }
    />

    <p>
      That peak comes after the crossing, so it should not be read as the speed required to
      escape. The agent also cannot observe its exact position relative to the step edge.
      Giving it that information might change how it approaches the band; these recordings
      do not isolate that effect.
    </p>

    <H2 id="limits">What I can conclude</H2>

    <p>
      Within this setup and budget, backward-speed shaping was the most reliable of the four
      rewards: 6 of 6 seeds reached the landing, compared with 0 of 6 for height shaping.
      Rewarding the intermediate motion needed for the jump chain worked better here than
      rewarding ordinary progress up the stairs. The one landing-only success establishes that
      a shaped reward was not necessary for every seed, but gives little confidence about
      how often unguided discovery would work.
    </p>

    <p>
      The reward definitions matter. These are particular record-based bonuses with particular
      caps. I did not test potential-based shaping, whose policy-invariance conditions are
      studied by Ng, Harada and Russell <Cite ids={[7]} />, and I have not shown that height is always a poor signal.
      A preliminary curriculum that explicitly rewarded stages of the jump recipe solved
      2 of 3 seeds, with a first success around 300k steps. More detailed guidance can help;
      that curriculum was excluded from the four-way comparison because it supplied the
      method I wanted the agents to discover.
    </p>

    <p>
      A useful negative control is still missing: compiling the version of the game that
      removes backward speed on landing, then running the same policies against it. That
      version did not build with this project's libsm64. The source comparison, reference
      replay and recorded jump chains support the identification of the exploit, but the
      patched-game control would test it more directly.
    </p>

    <p>
      Finally, this is one PPO baseline on one training staircase. It does not compare PPO
      with methods designed for hard exploration, such as Go-Explore <Cite ids={[11]} />.
      More seeds for the sparse reward and comparisons with exploration-focused methods
      would help establish how reliably the exploit can be discovered.
    </p>

    <References refs={BLJ_REFS} bibtex={BLJ_BIBTEX} />
  </Article>
);

export default BlogMario;
