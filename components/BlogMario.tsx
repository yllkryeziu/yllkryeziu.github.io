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
  { id: 'exploit', label: 'The exploit' },
  { id: 'harness', label: 'A simulator worth trusting' },
  { id: 'task', label: 'The task as an MDP' },
  { id: 'cost', label: 'What discovery costs' },
  { id: 'trap', label: 'The shaping trap' },
  { id: 'sound', label: 'What learning sounds like' },
  { id: 'render', label: 'Filming it in the real game' },
  { id: 'limits', label: 'What this does not show' },
];

const millions = (steps: number | null) =>
  steps === null ? 'never' : `${(steps / 1e6).toFixed(2)}M`;
const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const num = (value: number) => value.toLocaleString('en-US');
const signed = (value: number, digits = 1) => value.toFixed(digits);

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

// Every run that ever reached the landing, and the spread inside the one reward that always
// worked. Both matter: the first says whether the exploit is findable at all, the second says
// how little the answer to that question tells you about any single run.
const discovered = results.seeds.filter(seed => seed.firstSuccess !== null);
const speedDiscovered = seedsOf('speed').filter(seed => seed.firstSuccess !== null);
const earliest = Math.min(...speedDiscovered.map(seed => seed.firstSuccess!));
const latest = Math.max(...speedDiscovered.map(seed => seed.firstSuccess!));
const spread = latest / earliest;
const terminalSolver = results.seeds.find(
  seed => seed.rung === 'terminal' && seed.firstSuccess !== null,
)!;
const stalled = results.seeds.filter(seed => seed.firstSuccess === null);
const stalledPeaks = stalled.map(seed => seed.bestPeak).sort((a, b) => a - b);
const stalledBestPeak = stalledPeaks[0];
const stalledSecondPeak = stalledPeaks[1];
// Warps per episode over the last 1000 episodes of each height-shaped run, and the median best
// backwards speed those runs reach. One seed never gets to the barrier at all, so the range
// carries more than the average does.
const heightWarps = seedsOf('height').map(seed => seed.warps).filter(w => w > 0);
const heightWarpLo = Math.min(...heightWarps);
const heightWarpHi = Math.max(...heightWarps);
const heightPeaks = seedsOf('height').map(seed => seed.bestPeak).sort((a, b) => a - b);
const heightMedianPeak = (heightPeaks[2] + heightPeaks[3]) / 2;

const mediaByRung = (name: string) => results.media.rungs.find(row => row.rung === name)!;
const trapped = mediaByRung('height');

// The progression montage is one three-second excerpt per checkpoint of a single run. Discovery
// for that run is measured independently in the training log, so the level drop can be checked
// against it rather than asserted.
const progression = results.media.progression;
const preDiscovery = progression.filter(point => point.steps <= terminalSolver.firstSuccess!);
const postDiscovery = progression.filter(point => point.steps > terminalSolver.firstSuccess!);
const meanOf = (points: { rms: number }[]) =>
  points.reduce((sum, point) => sum + point.rms, 0) / points.length;
const preLevel = meanOf(preDiscovery);
const postLevel = meanOf(postDiscovery);
const levelDrop = 1 - postLevel / preLevel;

const occupancy = results.occupancy!;
const randomRef = occupancy.reference.find(row => row.policy === 'uniform random')!;
const untrainedRef = occupancy.reference.find(row => row.policy === 'untrained network')!;
const atStep = (target: number) =>
  occupancy.checkpoints.reduce((best, row) =>
    Math.abs(row.steps - target) < Math.abs(best.steps - target) ? row : best);
const relapse = atStep(6.3e6);
const breakthrough = atStep(7e6);
const converged = occupancy.checkpoints[occupancy.checkpoints.length - 1];

const geometry = results.geometry!;
const GEOMETRY_LABEL: Record<string, string> = {
  flat: 'Flat ground',
  ramp_20deg: 'Ramp',
  ramp_30deg: 'Ramp',
  ramp_37deg: 'Ramp',
  ramp_40deg: 'Ramp',
};
const geomLabel = (name: string) => {
  if (GEOMETRY_LABEL[name]) return GEOMETRY_LABEL[name];
  const match = name.match(/rise(\d+)_run(\d+)/);
  return match ? `Stairs, rise ${match[1]} run ${match[2]}` : name;
};
const runawayGeometries = geometry.full.filter(row => row.runaway);
const castleLike = geometry.full.find(row => row.geometry === 'stairs_rise75_run100')!;
const fullMag = geometry.byMagnitude.find(row => row.magnitude === 1)!;
const halfMag = geometry.byMagnitude.find(row => row.magnitude === 0.5)!;

const X_TICKS = [0, 5e6, 10e6, 15e6, 20e6].map(v => ({ v, label: `${v / 1e6}M` }));

// LineChart draws a marker at every point, so an 79-sample curve has to be thinned before it
// stops reading as a band.
function thin<T>(points: T[], target = 22): T[] {
  if (points.length <= target) return points;
  const step = (points.length - 1) / (target - 1);
  return Array.from({ length: target }, (_, i) => points[Math.round(i * step)]);
}

const RUNG_SERIES = RUNG_ORDER.map(name => {
  const rung = rungByName(name);
  return {
    label: `${RUNG_LABEL[name]} · ${rung.solved}/${rung.total}`,
    points: thin(rung.medianRate).map(([x, y]) => ({ x, y })),
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

const FIX_CODE = `s32 act_long_jump_land(struct MarioState *m) {
#ifdef VERSION_SH
    // BLJ (Backwards Long Jump) speed build up fix, crushing SimpleFlips's dreams since July 1997
    if (m->forwardVel < 0.0f) {
        m->forwardVel = 0.0f;
    }
#endif`;

const WARP_CODE = `if ((floor = gMarioState->floor) != NULL) {
    s32 index = floor->type - SURFACE_INSTANT_WARP_1B;
    if (index >= INSTANT_WARP_INDEX_START && index < INSTANT_WARP_INDEX_STOP
        && gCurrentArea->instantWarps != NULL) {
        struct InstantWarp *warp = &gCurrentArea->instantWarps[index];

        if (warp->id != 0) {
            gMarioState->pos[0] += warp->displacement[0];
            gMarioState->pos[1] += warp->displacement[1];
            gMarioState->pos[2] += warp->displacement[2];`;

const OBS_CODE = `observation = np.array([
    position[0] / _POSITION_SCALE,
    (self._scene.goal_y - position[1]) / _POSITION_SCALE,
    (position[2] - self._scene.goal_z) / _POSITION_SCALE,
    velocity[0] / _VELOCITY_SCALE,
    velocity[1] / _VELOCITY_SCALE,
    velocity[2] / _VELOCITY_SCALE,
    state.forwardVelocity / _SPEED_SCALE,
    math.sin(state.faceAngle),
    math.cos(state.faceAngle),
    extra.floorNormalY,
    (position[1] - extra.floorHeight) / 200.0,
    float(extra.hasFloor),
    float(extra.hasWall),
    float(extra.floorType == self._scene.warp.surface_type),
    (extra.peakHeight - position[1]) / 500.0,
    float(bool(mario_action & ACT_FLAG_AIR)),
    float(group == ACT_GROUP_MOVING),
    float(group == ACT_GROUP_STATIONARY),
    float(mario_action == ACT_LONG_JUMP),
    float(mario_action == ACT_LONG_JUMP_LAND),
    min(extra.actionTimer, 30) / 30.0,
    min(self._air_frames, 30) / 30.0,
    float(self._inputs.buttonA),
    float(self._inputs.buttonZ),
], dtype=np.float32)`;

const STICK_CODE = `gController.stickX = -64.0f * inputs->stickX;
gController.stickY = -64.0f * inputs->stickY;`;

// A clip either loops silently on its own or waits for a click. The ones that wait carry audio,
// so they cannot autoplay, and a video with preload="none" and no poster draws as a black
// rectangle until the reader presses play. Each of those ships a still of its own first
// interesting frame instead, named after the clip it belongs to.
const Clip: React.FC<{
  src: string;
  caption: React.ReactNode;
  n: number;
  loop?: boolean;
  wide?: boolean;
}> = ({ src, caption, n, loop, wide }) => (
  <Figure n={n} caption={caption}>
    <video
      src={`blj/${src}`}
      poster={loop ? undefined : `blj/${src.replace(/\.mp4$/, '.jpg')}`}
      controls
      muted={loop}
      loop={loop}
      autoPlay={loop}
      playsInline
      preload={loop ? 'auto' : 'none'}
      style={{ width: '100%', maxWidth: wide ? '100%' : '560px', display: 'block', margin: '0 auto' }}
    />
  </Figure>
);

const STRIP = [
  { src: '01-spawn.mp4', label: 'Spawn', note: 'frames 6725–6762' },
  { src: '02-approach.mp4', label: 'Walk into the warp band', note: '6752–6792' },
  { src: '03-pump.mp4', label: 'Two-frame cycle begins', note: '6918–6956' },
  { src: '04-fallback.mp4', label: 'Warped back down, 205 units', note: '7038–7150' },
  { src: '05-launch.mp4', label: 'Chain clears the band', note: '7284–7322' },
  { src: '06-goal.mp4', label: 'Top landing, y 4966', note: '7344–7384' },
];

const Strip: React.FC<{ n: number; caption: React.ReactNode }> = ({ n, caption }) => (
  <Figure n={n} caption={caption}>
    <div className="post-strip">
      {STRIP.map((cell, i) => (
        <div key={cell.src}>
          <video
            src={`blj/${cell.src}`}
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
            style={{ width: '100%', display: 'block' }}
          />
          <span className="cell-label">
            <span className="step">{String(i + 1).padStart(2, '0')}</span>
            {cell.label} · {cell.note}
          </span>
        </div>
      ))}
    </div>
  </Figure>
);

const Viewer: React.FC<{ n: number; caption: React.ReactNode }> = ({ n, caption }) => {
  const [on, setOn] = React.useState(false);
  return (
    <Figure n={n} caption={caption}>
      {on ? (
        <iframe
          src="blj/viewer3d.html"
          title="Backwards long jump, interactive"
          style={{ width: '100%', height: '620px', border: 0, borderRadius: '6px', background: '#edf1f3' }}
        />
      ) : (
        <button
          onClick={() => setOn(true)}
          style={{
            width: '100%',
            padding: '3.5rem 1rem',
            border: '1px dashed var(--color-border)',
            borderRadius: '6px',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            font: 'inherit',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Load the interactive trajectory (6.7 MB)
        </button>
      )}
    </Figure>
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
    <H2 id="exploit">The exploit</H2>

    <p>
      A <strong>backwards long jump</strong> is a speed exploit in Super Mario 64: every long jump
      multiplies Mario's forward velocity by 1.5 before clamping it, and the clamp tests only the
      upper side, so a long jump taken while moving backwards multiplies a negative number without
      bound. The exploit exists because a one-sided clamp on a signed quantity is a sign bug, and
      the 1996 code carries a comment saying exactly that <Cite ids={[2]} />:
    </p>

    <Code language="c" file="src/game/mario.c — set_mario_action_airborne, ACT_LONG_JUMP">
      {LAUNCH_CODE}
    </Code>

    <p>
      Nintendo did fix it, once, four years later. The Shindou release added two lines to the
      landing action that zero any negative speed, and the decompilation preserves them behind a
      version guard that the US build does not define:
    </p>

    <Code language="c" file="src/game/mario_actions_moving.c — act_long_jump_land">
      {FIX_CODE}
    </Code>

    <p>
      One multiplication does not produce a runaway on its own, because the air physics pull
      backwards speed toward a fixed point. The same frame update that leaves forward speed alone
      pushes negative speed up by two units per airborne frame, which makes <M>-16</M> an
      attractor rather than a floor:
    </p>

    <Code language="c" file="src/game/mario_actions_airborne.c — update_air_without_turn">
      {BRAKE_CODE}
    </Code>

    <p>
      So a chain of long jumps is a discrete dynamical system. If a launch at speed{' '}
      <M>v</M> spends <M>k</M> frames airborne and the air decay is <M>d</M> units per frame, the
      next launch happens at <M>{`v' = 1.5\\,(v - dk)`}</M>, and the chain grows only
      when <M>{`|v| > 3dk`}</M>. The decay <M>d</M> is not a constant of the game: with the stick
      held fully against Mario's facing it measures 0.85, and with the stick neutral it measures
      2.35. Neither of those numbers is the interesting one. <M>k</M> is, because it enters the
      condition multiplied by the decay and because it is the only term the level geometry
      controls.
    </p>

    <p>
      That is why the exploit needs stairs and not a hill. A staircase gives short air phases —
      Mario lands on the next tread down almost immediately — and stair treads are flat, with
      floor normal <M>y = 1</M>. Flatness is load-bearing. The game routes any landing with
      backwards speed on a slope straight into a slide, and it treats anything steeper than
      about 38° as a slope:
    </p>

    <Code language="c" file="src/game/mario_actions_moving.c">{SLIDE_CODE}</Code>

    <p>
      A scripted probe over fifteen floor shapes makes the boundary concrete. Ramps in the 20–37°
      range chain happily and go nowhere: air time falls from 30 frames to 19, backwards speed
      settles around <M>-23</M>, and the chain is stable rather than divergent. Three degrees
      further and the chain collapses — a 40° ramp manages five backwards relaunches against the
      37° ramp's 74, because the slope now trips <code>should_begin_sliding</code> and each
      backwards landing is diverted to <code>ACT_BEGIN_SLIDING</code>. Four of the fifteen shapes
      diverge, all of them staircases, and the one closest to the castle's own tread geometry —
      rise 75, run 100, a 36.9° envelope — reaches <M>{signed(castleLike.peak)}</M>
      in {castleLike.backwardsCycles} backwards relaunches.
    </p>

    <Table
      n={1}
      caption="Scripted long-jump chains on fifteen floor shapes, stick held fully against Mario's facing. A chain is marked divergent when backwards speed grows without settling. Air frames are the mean over the chain; the peak is the largest backwards speed reached before the chain broke."
      columns={[
        { key: 'floor', label: 'Floor' },
        { key: 'deg', label: 'Envelope', numeric: true },
        { key: 'cycles', label: 'Backwards relaunches', numeric: true },
        { key: 'air', label: 'Air frames', numeric: true },
        { key: 'peak', label: 'Peak speed', numeric: true },
        { key: 'runaway', label: 'Diverges' },
      ]}
      rows={geometry.full.map(row => ({
        floor: geomLabel(row.geometry),
        deg: row.degrees === null ? '—' : `${row.degrees}°`,
        cycles: num(row.backwardsCycles),
        air: row.meanAirFrames.toFixed(1),
        peak: signed(row.peak),
        runaway: row.runaway ? 'yes' : 'no',
        highlight: row.geometry === 'stairs_rise75_run100',
      }))}
    />

    <p>
      Full stick deflection matters for the same reason: it is what buys the low decay. At
      magnitude 0.5 the chain diverges on {halfMag.runaway} of {halfMag.total} shapes and peaks
      at <M>{signed(halfMag.bestPeak)}</M>; at magnitude 1.0 it diverges on{' '}
      {fullMag.runaway} of {fullMag.total} and peaks at <M>{signed(fullMag.bestPeak)}</M>. On the
      castle-like geometry it does not diverge below full deflection at all.
    </p>

    <H3 id="target">What the speed is for</H3>

    <p>
      The staircase to the castle's top floor is locked behind a check that runs once per frame.
      Twelve of the castle's 1,923 collision triangles carry <code>SURFACE_INSTANT_WARP_1B</code>,
      and standing on one of them teleports Mario backwards down the stairs:
    </p>

    <Code language="c" file="src/game/level_update.c — check_instant_warp">{WARP_CODE}</Code>

    <p>
      The displacement for this area is <M>{`(0, -205, +410)`}</M>: 205 units down and 410 units
      back. The check samples the floor Mario is standing on, once, at a fixed point in the frame,
      so it can only be evaded by stepping over the trigger entirely — being above it on one
      sample and past it on the next. The triggering triangles span <M>z \in [905, 1059]</M>,
      which makes the band {results.escapeSpeed} units deep, and that number is the whole task:
      one frame's displacement has to exceed it. Mario's fastest ordinary movement is a long jump
      at the clamp, 48 units per frame. The gap between 48 and {results.escapeSpeed} is not a
      matter of skill or of tuning. It cannot be closed by any legitimate movement in the game.
    </p>

    <KeyNumbers
      items={[
        { k: 'Warp band depth', v: `${results.escapeSpeed}`, s: 'units of z, sampled once per frame' },
        { k: 'Fastest clean movement', v: '48', s: 'units/frame, the long-jump clamp' },
        { k: 'Peak the policy reaches', v: '1,118', s: 'units/frame, 7.3× the requirement' },
      ]}
    />

    <p>
      A trained policy's launch sequence is worth reading frame by frame. It holds A and Z on one
      frame and releases A on the next, because <code>INPUT_A_PRESSED</code> is an edge and never
      re-latches on a held button. Each press frame multiplies the magnitude by almost exactly
      1.5 — the shortfall is the 2% air drag paid on the release frame. Twenty frames after the
      first press, the chain clears the band.
    </p>

    <Table
      n={2}
      caption="Press frames from the filmed episode, results/replay_model_endless.json. Ratio is against the immediately preceding frame, which is not always the row above, since the release frames between presses are omitted. The warp band spans z [905, 1059]; the escape happens when one frame's displacement crosses it entirely."
      columns={[
        { key: 'frame', label: 'Frame', numeric: true },
        { key: 'vel', label: 'Forward velocity', numeric: true },
        { key: 'ratio', label: 'Ratio', numeric: true },
        { key: 'z', label: 'z after the frame', numeric: true },
        { key: 'state', label: 'Against the band' },
      ]}
      rows={[
        { frame: '562', vel: '−77.43', ratio: '1.484', z: '1809.1', state: 'far above' },
        { frame: '564', vel: '−112.97', ratio: '1.489', z: '1723.0', state: 'far above' },
        { frame: '566', vel: '−163.65', ratio: '1.478', z: '1570.0', state: 'past 154, still too far to test' },
        { frame: '568', vel: '−238.14', ratio: '1.485', z: '1365.0', state: 'above' },
        { frame: '570', vel: '−347.64', ratio: '1.489', z: '1109.0', state: 'one frame above the band' },
        { frame: '571', vel: '−340.69', ratio: '0.980 (drag)', z: '878.0', state: 'below — cleared, no warp', highlight: true },
        { frame: '572', vel: '−508.61', ratio: '1.493', z: '750.9', state: 'past' },
        { frame: '576', vel: '−1117.80', ratio: '1.497', z: '150.7', state: 'against the far wall' },
      ]}
    />

    <p>
      The band is not only a speed threshold, which took me a while to accept. Earlier in the same
      episode the policy reached <M>-179.64</M> at frame 213 — comfortably past{' '}
      {results.escapeSpeed} — and warped anyway on frame 214, because that frame carried it
      from <M>z = 1160</M> to <M>z = 995.6</M>, which is inside the band. Crossing requires arriving
      in phase as well as arriving fast, and phase is not something the policy can see. Overshooting
      by a factor of seven is how a policy buys robustness against a state variable it has no
      access to.
    </p>

    <Clip
      n={1}
      src="05-launch.mp4"
      loop
      caption={
        <>
          The fourteen-frame escape, rendered in the game at 30 fps with the measured state
          overlaid. Forward velocity multiplies on every A-press frame; the caption fires when
          Mario's sampled floor is a warp triangle.
        </>
      }
    />

    <H2 id="harness">A simulator worth trusting</H2>

    <p>
      Everything above is a claim about one specific 1996 binary, which means the environment has
      to be that binary and not a model of it. The chain is a 45-frame sequence of
      floating-point multiplications with a collision query in the middle; a re-implementation
      that is 1% wrong in the air-decay term does not produce a 1%-worse exploit, it produces no
      exploit.
    </p>

    <p>
      The environment steps <strong>libsm64</strong> <Cite ids={[3]} />, which compiles the
      decompilation's Mario <Cite ids={[2]} /> as a shared library advanced one frame at a time by{' '}
      <code>sm64_mario_tick</code>. I checked it two ways. A file-by-file diff of every source file
      in the chain against <code>n64decomp/sm64</code> at commit <code>9921382a</code> found them
      byte identical. That establishes that the code is right, not that the harness drives it
      right, so the second check replays a human artefact through it: the TASVideos 0-star
      run <Cite ids={[1]} />, {num(results.validation.movie.input_samples)} controller samples
      against a ROM whose SHA-1 matches the one the movie was recorded on.
    </p>

    <p>
      The run replays in sm64-port <Cite ids={[4]} /> with no desync, and 8,737 of its 8,772
      controller records are byte-exact against the movie file, with all 35 mismatches falling in
      the pre-Mario intro. The part that matters is the longest backwards long jump chain in the
      movie: castle area 1, frames 3709 to 3739, sixteen relaunches, peaking at forward velocity{' '}
      <M>{results.validation.peakReference.toFixed(2)}</M>. Seeded at that frame,
      libsm64 reproduces {results.validation.framesBitExact} of{' '}
      {results.validation.framesCompared} frames bit-identically in position, velocity and forward
      velocity, with the same action on every frame and the same peak to the last bit. The
      per-frame multiplication ratios span 1.4952 to 1.4996.
    </p>

    <p>
      Where libsm64 stops is as important as where it agrees. It has no level logic, so it cannot
      follow a door or an instant warp; a basement comparison diverges hard at frame 4055 for
      exactly that reason. This is a scope gap rather than a physics disagreement, and it is why
      the environment implements <code>check_instant_warp</code> itself against the level's own
      collision data. Three further gaps are worth writing down for anyone building on the same
      library: camera yaw is quantised by <code>gArctanTable</code>, so an environment should drive{' '}
      <code>camLook</code> directly rather than imitate the real camera; there are no setters for{' '}
      <code>actionState</code>, <code>actionTimer</code>, <code>actionArg</code> or the{' '}
      <code>framesSince</code> counters, so exact seeding only works on frames where the reference
      has them all zero; and a freshly created Mario has a dirty{' '}
      <code>marioObj-&gt;oInteractStatus</code> that can raise <code>INPUT_UNKNOWN_10</code> and
      throw him into <code>ACT_SHOCKWAVE_BOUNCE</code> on the first tick, which costs one discarded
      warm-up tick to avoid.
    </p>

    <Note label="The bug that stalled this for a week">
      <p>
        An earlier scripted sweep over launch angles and air-stick settings found no chain on any
        geometry, and I read that as evidence the exploit needed frame-perfect inputs. It did not.
        libsm64 takes stick axes in <M>[-1, 1]</M> and scales them internally:
      </p>
      <Code language="c" file="src/libsm64.c:241">{STICK_CODE}</Code>
      <p>
        The sweep passed <M>{`\\pm 64`}</M> and <M>0</M>. So it tested exactly two regimes: no
        backwards drive at all, and a stick magnitude of 4,096 that drove forward velocity
        to <M>-6142</M> in a single frame and threw Mario out of the level. It never tested the
        usable range in between, which is the only range where the chain exists. The measurement
        that came out of that week is the geometry table above, and it only became possible once
        the units were right.
      </p>
    </Note>

    <p>
      One process holds one static surface set, so the vectorised environment
      uses <code>SubprocVecEnv</code> with the spawn start method. Throughput is 7,700 environment
      steps per second in a single process and about 2,500 with PPO in the loop at twelve
      environments.
    </p>

    <H2 id="task">The task as an MDP</H2>

    <p>
      The agent sees a 24-dimensional float vector and chooses one of 36 discrete actions. The
      observation is deliberately small, and listing it in full is the honest way to describe what
      the policy is working from:
    </p>

    <Code language="python" file="src/env/blj_env.py — BljEnv._observe" note="Scales: position 4000, velocity 50, forward speed 200. Clipped to [-10, 10].">
      {OBS_CODE}
    </Code>

    <p>
      Two design choices in there do most of the work. The last two dimensions are the{' '}
      <em>previous</em> frame's A and Z, which is what makes the phase of the two-frame press cycle
      observable at all; without them the policy would be trying to learn an edge-triggered
      behaviour from a state that cannot represent edges. And the action space is nine stick
      directions at full deflection crossed with the four A/Z combinations. Full deflection is not
      a simplification for the sake of a smaller space — the geometry table says the chain does not
      diverge on castle-like stairs at any lesser magnitude.
    </p>

    <p>
      The action repeat is 1, and it has to be. <code>INPUT_A_PRESSED</code> is an edge, so holding
      A across two frames produces one press. At an action repeat of 2 the two-frame cycle is not
      merely harder to find, it is <em>inexpressible</em>: the policy cannot emit the input
      sequence the exploit requires. That is a property of the game's input handling rather than of
      the learning algorithm, and it is the kind of thing worth checking before blaming
      exploration.
    </p>

    <p>
      What the policy cannot see is floor geometry. The observation summarises the floor with a
      normal-y, a height and a warp-type flag, so the policy knows whether it is on something flat
      and whether that something teleports, but not which step it is on or where the step edge is.
      The task is a genuine POMDP and the escape condition — arriving at the band in phase — is a
      function of unobserved state. I did not fix this. It is the reason the converged policy
      overshoots the threshold by a factor of seven instead of crossing it by a margin.
    </p>

    <H3 id="reward">The reward, and why every term is bounded</H3>

    <p>
      Reaching the top landing at <M>y = 4966</M> pays 1.0. Every shaping term is a bounded
      fraction of that, with a ceiling of 0.25, which is what makes the four reward variants
      comparable without rescaling: a return of 1.0 means the exploit was performed, and nothing
      else can manufacture it.
    </p>

    <Table
      n={3}
      caption="The four reward variants. Each was run on six seeds to 20M timesteps, for 24 runs in total. Fastest discovery is the earliest timestep at which any seed of that variant first reached the landing."
      columns={[
        { key: 'name', label: 'Reward' },
        { key: 'terms', label: 'Terms beyond the goal' },
        { key: 'ceiling', label: 'Shaping ceiling', numeric: true },
        { key: 'solved', label: 'Seeds solved', numeric: true },
        { key: 'fastest', label: 'Fastest discovery', numeric: true },
      ]}
      rows={RUNG_ORDER.map(name => {
        const rung = rungByName(name);
        const solvedSeeds = seedsOf(name).filter(seed => seed.firstSuccess !== null);
        return {
          name: RUNG_LABEL[name],
          terms:
            name === 'terminal'
              ? 'none'
              : name === 'speed'
                ? 'record backwards speed'
                : name === 'height'
                  ? 'record height climbed on foot'
                  : 'both',
          ceiling: name === 'terminal' ? '0' : name === 'height_speed' ? '0.25 + 0.25' : '0.25',
          solved: `${rung.solved} / ${rung.total}`,
          fastest: solvedSeeds.length
            ? millions(Math.min(...solvedSeeds.map(seed => seed.firstSuccess!)))
            : 'never',
          highlight: name === 'height',
        };
      })}
    />

    <p>
      Both shaping terms are potential-based, paying only when an episode sets a new
      record <Cite ids={[7]} />. That is not a theoretical nicety here. The instant warp throws
      Mario back down the stairs constantly, so a per-frame progress term would pay him forever for
      re-climbing the same six steps, and the optimal policy under it is to walk into the warp band
      on purpose. Height counts only while Mario is grounded and within 30 units of the floor,
      because a plain jump buys about 220 units of air that could otherwise be farmed on the spot
      without moving.
    </p>

    <Note label="The reward-scale bug, as a measurement">
      The first version of the speed term paid <M>0.01</M> per unit of record backwards speed. At a
      peak of <M>-6000</M> that is a return of about 59 against a goal worth 1.0, so the agent was
      being paid roughly sixty times more for going fast than for finishing. It learned exactly
      that: long chains, no interest in the landing. Bounding the term at 0.25 took the speed
      variant from 2 of 3 seeds solving with a fastest discovery at 3.7M steps to{' '}
      {rungByName('speed').solved} of {rungByName('speed').total} with a fastest discovery
      at {millions(earliest)}. The bound is not hygiene, it is the difference between a reward that
      points at the goal and one that points past it. Bounding it is the result.
    </Note>

    <H2 id="cost">What discovery costs</H2>

    <p>
      Twenty-four runs, four reward variants, six seeds each, 20M timesteps per run:{' '}
      {num(results.totals.episodes)} episodes and {num(results.totals.successes)} successes in
      total. {discovered.length} of the 24 runs found the exploit. The distribution
      of <em>when</em> is the part worth looking at.
    </p>

    <Figure
      n={2}
      caption="Timestep at which each run first reached the top landing, sorted. Coloured bars are the ten runs that found the exploit; muted bars are the fourteen that never did, drawn at the 20M ceiling. Hovering a muted bar gives the best backwards speed that run ever reached."
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
      Within the one reward variant that always worked, the fastest seed discovered the exploit
      at {millions(earliest)} steps and the slowest at {millions(latest)} — a spread
      of {spread.toFixed(1)}×, on identical hyperparameters, identical geometry and an environment
      that contributes no randomness at all. Spawn jitter defaults to zero, and three different
      environment seeds produce byte-identical 300-frame trajectories. The seed controls initial
      weights and action sampling, nothing else.
    </p>

    <p>
      This is why there is no mean anywhere in this post. Reporting{' '}
      {millions(
        Math.round(speedDiscovered.reduce((s, x) => s + x.firstSuccess!, 0) / speedDiscovered.length),
      )}{' '}
      as an average discovery time would describe none of the six runs and would hide the fact that
      two of them spent more than 16M steps finding what another found in 0.58M. Outcomes on this
      task bifurcate rather than cluster, and the honest summary statistic is seeds solved out
      of six <Cite ids={[10]} />.
    </p>

    <Figure
      n={3}
      caption="Median success rate over training for each reward, six seeds per curve, binned at 250k timesteps. The median is taken across seeds at each bin, so a curve rises off zero only once at least half its seeds have discovered the exploit; the height curve never does."
    >
      <LineChart
        title="Success rate by reward"
        sub="median across 6 seeds · 250k-step bins"
        xLabel="timesteps"
        yLabel="success rate"
        xTicks={X_TICKS}
        series={RUNG_SERIES}
        unit=""
        footer="results/curves_page.json"
      />
    </Figure>

    <H3 id="baseline">What the untrained policy does instead</H3>

    <p>
      A uniform random policy over the 36 actions, run for {occupancy.rollouts} rollouts
      of {num(occupancy.frames)} frames, reaches a best backwards
      speed of <M>{signed(randomRef.bestPeak)}</M> — the air attractor, not a chain — and a best
      height of {num(randomRef.bestHeight)}, which is exactly the spawn height. It never climbs a
      single step. An untrained network is the same:{' '}
      <M>{signed(untrainedRef.bestPeak)}</M> and {num(untrainedRef.bestHeight)}.
    </p>

    <p>
      Where do the frames go? {pct(randomRef.groundPound.mean / 100, 1)} of them are spent in{' '}
      <code>ACT_GROUND_POUND</code> or <code>ACT_GROUND_POUND_LAND</code>. Eighteen of the 36
      actions hold Z and eighteen press A, and A pressed while airborne with Z held is the
      ground-pound trigger. Ground pound is cheap to enter and slow to leave, so its share of
      frames vastly exceeds its share of actions. It is an attractor in the action space, and it
      eats most of the early exploration budget.
    </p>

    <p>
      Tracking that occupancy across one run's checkpoints turns exploration into something you can
      watch. I took the run that discovered the exploit with no shaping at all — the landing-only
      reward, seed {terminalSolver.seed}, first success at {millions(terminalSolver.firstSuccess)} —
      and rolled out {occupancy.rollouts} × {num(occupancy.frames)} frames from each of its 41
      checkpoints.
    </p>

    <Figure
      n={4}
      caption="Share of frames spent in the ground-pound actions and in ACT_LONG_JUMP, across 41 checkpoints of one landing-only run (seed 2). Four rollouts of 1500 frames per checkpoint. The crossing at 6M coincides with the first episode that reached the landing at 6.32M; the 6.3M point is a relapse to a pure ground-pound policy."
    >
      <LineChart
        title="Where the frames go"
        sub="terminal reward, seed 2 · 4 × 1500 frames per checkpoint"
        xLabel="timesteps"
        yLabel="% of frames"
        xTicks={X_TICKS}
        series={OCCUPANCY_SERIES}
        unit="%"
        footer="results/action_occupancy.json"
      />
    </Figure>

    <p>
      Three things in that curve are worth naming. First, the 2.0M checkpoint is statistically
      indistinguishable from uniform random: its ground-pound share ranges 69.6–79.6% across
      rollouts, and uniform random's own range is 72.0–77.7%. On a reward that has returned exactly
      0.0 for every episode so far, that is not a failure of PPO, it is the correct behaviour of
      PPO. There is no gradient to follow, and the policy is doing the only thing a
      policy-gradient method can do with a constant return, which is drift under the entropy
      bonus <Cite ids={[5]} />.
    </p>

    <p>
      Second, the long-jump share climbs to {breakthrough.longJump.mean.toFixed(1)}% and the peak
      backwards speed jumps to <M>{signed(breakthrough.bestPeak)}</M> between 6.0M and 7.0M, which
      brackets the measured first success. Third, and this is the part I would not have predicted,
      the 6.3M checkpoint — sampled between the 6.0M checkpoint that reaches{' '}
      <M>-1023</M> and the 6.5M one that solves an episode — is a{' '}
      <em>relapse</em>: {relapse.groundPound.mean.toFixed(1)}% ground pound,{' '}
      {relapse.longJump.mean.toFixed(1)}% long jump, best backwards
      speed <M>{signed(relapse.bestPeak)}</M>, best height back down to{' '}
      {num(relapse.bestHeight)}. A single episode's worth of reward against 512-step rollouts and
      ten epochs of updates is a weak signal, and the policy loses the behaviour before it keeps
      it. By 20M the long-jump share settles
      at {converged.longJump.min.toFixed(1)}–{converged.longJump.max.toFixed(1)}% across
      rollouts, which is the two-frame cycle and nothing else.
    </p>

    <Clip
      n={5}
      src="discovery.mp4"
      wide
      caption={
        <>
          Sixty-four policies per panel, one panel per reward, sampled at fourteen checkpoints from
          0.1M to 20M timesteps. Red marks a policy being warped back down 205 units; the dashed
          line is the landing at y 4966. Reading clockwise from the top left: speed, height and
          speed, height, landing only.
        </>
      }
    />

    <H2 id="trap">The shaping trap</H2>

    <p>
      The landing-only reward solved 1 of 6 seeds. Adding a bounded, potential-based, entirely
      reasonable bonus for climbing the staircase on foot solved{' '}
      {rungByName('height').solved} of {rungByName('height').total}. Height shaping is worse than
      no shaping at all, and the mechanism is specific enough to be worth stating carefully.
    </p>

    <p>
      The height term states the goal and says nothing about how to reach it: go up, get paid,
      capped at 0.25 for the whole climb. That is exactly the shape of reward that works on most
      navigation tasks. Here it goes flat at <M>y = 3960</M>, because that is where the warp
      barrier is and no amount of ordinary movement gets past it. So the term is a smooth gradient
      over the region where ordinary movement works, and a constant over the region where the
      exploit lives. There is no gradient across the discontinuity, and the discontinuity is the
      entire problem.
    </p>

    <p>
      What the term does provide is a comfortable place to sit. The six height-shaped runs all
      terminate at exactly 6,660 episodes, which is 20M steps divided by the 3,000-frame episode
      cap, meaning every single episode ran the clock out. Five of the six warp
      between {heightWarpLo.toFixed(0)} and {heightWarpHi.toFixed(0)} times per episode; the sixth
      never reaches the barrier at all. The policy climbs to the barrier, collects the height
      record, gets thrown back down, climbs again, and re-collects nothing — the record is already
      set — while the clock runs. Its median best backwards speed across the six seeds
      is <M>{signed(heightMedianPeak)}</M>, which is the <M>-16</M> air attractor plus a couple of
      failed launches.
    </p>

    <p>
      Across all fourteen runs that never discovered the exploit, the best backwards speed reached
      by any of them was <M>{signed(stalledBestPeak)}</M>, against a threshold
      of {results.escapeSpeed}. One height-shaped seed got to 95% of what it needed and never
      crossed; the other thirteen never exceeded <M>{signed(stalledSecondPeak)}</M>. That is what a
      threshold with no gradient across it looks like from below. Ninety-five per cent of the
      required speed buys exactly nothing, so there is no continuum to climb: a run either builds a
      chain or sits at the attractor.
    </p>

    <p>
      Adding the speed term back on top of height recovers part of it —{' '}
      {rungByName('height_speed').solved} of {rungByName('height_speed').total}, against{' '}
      {rungByName('speed').solved} of {rungByName('speed').total} for speed alone. The speed term
      works because it is the one term whose gradient points across the discontinuity: it is
      defined as the fraction of the escape speed reached, so it pays for progress toward a number
      that ordinary movement cannot approach, and it saturates exactly when Mario is fast enough to
      cross the band rather than rewarding unbounded speed for its own sake. Height shaping
      rewards the thing you want. Speed shaping rewards the thing that gets it.
    </p>

    <p>
      Evaluating the converged policies on the true objective makes the gap plain. Every swarm
      below was scored with a terminal-only reward regardless of what it trained on, so mean return
      is the success rate:
    </p>

    <Table
      n={4}
      caption="Converged behaviour at 20M timesteps, 64 policies per reward evaluated for 30 seconds of game time on a terminal-only reward. Episodes are counted across the swarm; mean return equals the success rate because the only payable term is the landing."
      columns={[
        { key: 'name', label: 'Reward' },
        { key: 'episodes', label: 'Episodes', numeric: true },
        { key: 'successes', label: 'Reached landing', numeric: true },
        { key: 'ret', label: 'Mean return', numeric: true },
        { key: 'height', label: 'Best height', numeric: true },
        { key: 'peak', label: 'Peak backward', numeric: true },
      ]}
      rows={RUNG_ORDER.map(name => {
        const row = mediaByRung(name);
        return {
          name: RUNG_LABEL[name],
          episodes: num(row.episodes),
          successes: num(row.successes),
          ret: row.meanReturn.toFixed(4),
          height: num(row.bestHeight),
          peak: signed(row.bestPeakBackward),
          highlight: name === 'height',
        };
      })}
    />

    <p>
      The height-shaped swarm produces {trapped.episodes} episodes to the others' 326–392, because
      an episode that never terminates early takes the full 3,000 frames, and it
      reaches {num(trapped.bestHeight)} against the landing at 5,018. It is the one row where the
      best backwards speed, <M>{signed(trapped.bestPeakBackward)}</M>, is the air attractor rather
      than a chain.
    </p>

    <Clip
      n={6}
      src="rungs.mp4"
      wide
      caption={
        <>
          The four rewards at 20M timesteps, 64 policies each, 30 seconds of game time with the
          game's own audio mixer rendering the whole population. The height-shaped panel warps 574
          times in this clip and reaches the landing zero times.
        </>
      }
    />

    <H2 id="sound">What learning sounds like</H2>

    <p>
      The audio engine's state in the decompilation is a file-scope global rather than part of the
      per-Mario state the environment clones, which has a convenient consequence: one audio tick
      per frame renders the entire population through the game's own mixer. A swarm of 64 policies
      is audible as a single mix, saturating at around eight simultaneous Marios — RMS measures
      4,795 for one, 6,179 for eight and 6,174 for forty-eight.
    </p>

    <p>
      This turns out to be a diagnostic. <code>act_long_jump</code> plays{' '}
      <code>SOUND_MARIO_YAHOO</code> on entry, and a working chain re-enters that action on nearly
      every frame, so a policy performing the exploit screams continuously. The instant warp, by
      contrast, plays nothing at all: there is no sound on the{' '}
      <code>SURFACE_INSTANT_WARP</code> path, and the environment applies the displacement itself.
      The failure mode is inaudible. The trapped swarm's 574 warps in thirty seconds are silent,
      and what you hear instead is 64 Marios calmly jogging up a staircase.
    </p>

    <Table
      n={5}
      caption="Audio statistics over 30 seconds of each converged swarm, measured on the dumped 32 kHz stereo stream. Centroid is the spectral centroid; bright is the fraction of energy above 2 kHz; loud frames are those above a fixed amplitude floor."
      columns={[
        { key: 'name', label: 'Reward' },
        { key: 'rms', label: 'RMS', numeric: true },
        { key: 'peak', label: 'Peak', numeric: true },
        { key: 'centroid', label: 'Centroid', numeric: true },
        { key: 'bright', label: 'Bright', numeric: true },
        { key: 'loud', label: 'Loud frames', numeric: true },
      ]}
      rows={RUNG_ORDER.map(name => {
        const row = mediaByRung(name);
        return {
          name: RUNG_LABEL[name],
          rms: row.audio.rms.toFixed(1),
          peak: num(row.audio.peak),
          centroid: `${row.audio.centroid_hz.toFixed(0)} Hz`,
          bright: pct(row.audio.bands.bright),
          loud: pct(row.audio.loud_frame_fraction),
          highlight: name === 'height',
        };
      })}
    />

    <p>
      The trapped swarm is the loudest of the four by RMS ({trapped.audio.rms.toFixed(1)} against
      1,777–1,859) and the darkest by centroid ({trapped.audio.centroid_hz.toFixed(0)} Hz
      against 1,873–1,931 Hz). Band by band against the mean of the three escaping swarms it
      carries {results.media.trappedOverEscapingByBand.sub.toFixed(2)}× the sub-bass
      and {results.media.trappedOverEscapingByBand.low_voice.toFixed(2)}× the low-voice energy,
      but only {results.media.trappedOverEscapingByBand.bright.toFixed(2)}× the bright energy.
      Footsteps and landings are low and broad; the yahoo is bright and periodic.
    </p>

    <p>
      Which means the moment of discovery has a signature you can measure without looking at a
      single reward curve. Taking a three-second excerpt from each checkpoint of the
      landing-only run and measuring its level gives a drop
      of {pct(levelDrop, 0)} — {preLevel.toFixed(0)} before
      against {postLevel.toFixed(0)} after — landing exactly at the boundary between the 6M and 7M
      checkpoints. That run's first success is logged at{' '}
      {millions(terminalSolver.firstSuccess)} steps, measured independently from the training log.
      Flailing is loud. The exploit is quiet. Mastery, in this environment, sounds like less noise.
    </p>

    <Figure
      n={7}
      caption="Output level of a three-second excerpt from each of thirteen checkpoints of the landing-only run, seed 2. The step between the 6M and 7M checkpoints brackets that run's first success at 6.32M timesteps, which was measured from the training log rather than from the audio."
    >
      <LineChart
        title="Output level across training"
        sub="terminal reward, seed 2 · 3 s excerpt from 8 s into each capture"
        xLabel="timesteps"
        yLabel="RMS"
        xTicks={X_TICKS}
        series={RMS_SERIES}
        unit=""
        footer="results/media_summary.json"
      />
    </Figure>

    <Clip
      n={8}
      src="learning.mp4"
      caption={
        <>
          One run learning: thirteen checkpoints of a 64-policy swarm, three seconds each, with the
          audio taken from the same checkpoints in the same order. The drop in level at the eighth
          segment — the 7M checkpoint — is the discovery.
        </>
      }
    />

    <H2 id="render">Filming it in the real game</H2>

    <p>
      Two things had to be true at once for the footage above: the frames had to come out of the
      real game, and the trajectory in them had to be the measured one. libsm64 gives the second
      and has no renderer; sm64-port <Cite ids={[4]} /> gives the first and has no way to take
      instructions from a policy. So the policy runs in libsm64, its state is recorded at 64 bytes
      per frame, and sm64-port is patched to stamp that state onto Mario instead of simulating him.
    </p>

    <p>
      The stamp sits between Mario's action update and the copy into his object, so the object, the
      graphics node and the camera all read the recorded state. The recorded action is only
      re-entered when it differs from the previous frame's, which keeps <code>set_mario_action</code>'s
      entry sounds and animation choices intact rather than restarting them every frame. Because
      every frame is <em>replaced</em> with the measured state rather than re-simulated from
      recorded inputs, the drawn path cannot drift from the measured one the way an open-loop input
      replay would.
    </p>

    <p>
      Audio needed one more patch. The game's audio buffer size normally tracks how much the
      device has left to play, which makes it a function of wall-clock time and therefore useless
      for a dump. While dumping, it is overridden with the cycle 528, 528, 544 samples, whose mean
      is exactly 533.33, so two blocks per frame come to 32000/30 samples and the dumped audio
      stays locked to a 30 fps render indefinitely. Measured drift over the 660 frames of the full
      episode is 0.3 ms.
    </p>

    <Strip
      n={9}
      caption="One successful episode from the landing-only policy, in six pieces, rendered at 960×666 from the game's own frames. Frame numbers are into the injected render. The fourth panel is a failed escape: the policy crosses into the warp band and is displaced 205 units down and 410 back."
    />

    <Clip
      n={10}
      src="00-full.mp4"
      wide
      caption="The same episode uncut: 660 frames, 22.0 seconds, from spawn to the top landing. Audio is the game's, dumped at 32 kHz and locked to the frame rate."
    />

    <p>
      For the swarm views, one further compression was needed, because 64 Marios at 900 frames is
      a lot of pose data. Keying each pose on <M>{`(\\texttt{animID}, \\texttt{animFrame})`}</M>{' '}
      collapses an 1,100-frame run to 69 unique poses, with median and 99th-percentile disagreement
      of exactly 0.000 units and a worst case of 17.6 against a Mario about 160 units tall. That is
      10 bytes per Mario per frame, or 0.29 MB for 32 Marios over 900 frames. The obvious
      improvement — un-rotating each pose by the graphics node's yaw — makes it worse by 410 units,
      because <code>geo_process_root_hack_single_node</code> bakes the mesh at Mario's position
      with yaw only.
    </p>

    <Viewer
      n={11}
      caption="The filmed episode as an interactive trajectory: floor height, forward velocity and the warp band, scrubbable frame by frame. Loads on click because the geometry and the full 653-frame trace are embedded in the page."
    />

    <H2 id="limits">What this does not show</H2>

    <p>
      The headline result rests on one run. A single seed out of six discovered the exploit under
      the landing-only reward, and six seeds is thin for a claim about a bimodal
      outcome <Cite ids={[10]} />. What I can defend is the direction of the comparison — height
      shaping solved fewer seeds than no shaping at all, 0 against 1, and the mechanism for that
      is visible in the per-episode warp counts rather than inferred from the aggregate — and the
      spread within the reward that always worked, {spread.toFixed(1)}× on identical
      hyperparameters. I would not defend {millions(terminalSolver.firstSuccess)} as an estimate of
      anything.
    </p>

    <p>
      Everything here is one staircase in one level of one game. A transfer probe I have not
      written up properly puts a bound on how little that generalises: of the 24 trained policies,
      10 solve the castle staircase they were trained on, 9 solve a 284-triangle rebuild of its
      tread geometry at a success rate of 0.775, and 0 survive any change that leaves the vertical
      faces between treads in place. Peak backwards speed falls from <M>-656</M> to
      about <M>-41</M> under those changes, which is roughly two launches before the chain
      dies. The policies learned a staircase, not a mechanic. That probe also only evaluates final
      policies, so it says nothing about whether discovery transfers.
    </p>

    <p>
      The observation is partial in a way that matters for the central result: the escape condition
      depends on where in the warp band Mario arrives, and the policy cannot see that. So
      "the policy needs 7.3× the threshold speed" is a statement about this observation space, not
      about the exploit. A policy that could see the band's edge would presumably need far less.
    </p>

    <p>
      Finally, nothing here is a claim about sample efficiency relative to methods built for
      hard-exploration problems. Go-Explore's archive <Cite ids={[11]} /> exists precisely because
      undirected exploration is bad at discrete discoveries like this one, and a fair comparison
      would need the same environment, the same budget and the same seed protocol. What this post
      measures is what a standard PPO baseline <Cite ids={[5, 6]} /> costs on a task where the
      reward can only be collected by exploiting a floating-point sign bug — and how much of that
      cost is decided by the reward rather than by the algorithm.
    </p>

    <References refs={BLJ_REFS} bibtex={BLJ_BIBTEX} />
  </Article>
);

export default BlogMario;
