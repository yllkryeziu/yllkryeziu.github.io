import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Projects live outside this repo. Override with PROJECTS_ROOT.
const projectsRoot = resolve(root, process.env.PROJECTS_ROOT ?? '..');
const locate = path =>
  path.startsWith('projects/') ? resolve(projectsRoot, path.slice('projects/'.length))
                               : resolve(root, path);
const read = path => JSON.parse(readFileSync(locate(path), 'utf8'));
const readIf = path => (existsSync(locate(path)) ? read(path) : null);
const round = (value, digits = 2) =>
  value === null || value === undefined ? null : Number(value.toFixed(digits));

function distillSimd() {
  const environment = readIf('projects/simdjson-jni/results/environment.json');
  const equivalence = readIf('projects/simdjson-jni/results/equivalence.json');
  const summary = readIf('projects/simdjson-jni/results/summary.json');
  if (!environment || !equivalence || !summary) {
    throw new Error('simdjson benchmark has not produced a complete run yet');
  }
  return { environment, equivalence, summary };
}

// The twelve SURFACE_INSTANT_WARP_1B triangles in the castle's staircase span this z range; its
// width is the per-frame displacement an escape has to beat.
const BAND_Z = [905, 1059];

function distillMario() {
  const root = 'projects/mario-blj/results/';
  const episodes = read(`${root}episode_stats.json`);
  const curves = read(`${root}curves_page.json`);
  const media = read(`${root}media_summary.json`);
  const tas = read(`${root}tas_validation.json`);
  const env = read(`${root}env_validation.json`);
  const occupancy = readIf(`${root}action_occupancy.json`);
  const replay = readIf(`${root}replay_model_endless.json`);
  const swarmManifest = readIf(`${root}swarm_render_manifest.json`);
  const throughput = readIf(`${root}throughput.json`);
  const transfer = readIf(`${root}transfer.json`);
  const transferExpert = readIf(`${root}transfer_expert.json`);

  // One row per training run. first_success is null for a seed that never found the exploit, and
  // those seeds all stop at exactly the same episode count because every episode times out, so the
  // count is itself a discovery signal and worth keeping rather than collapsing to a rate.
  const seeds = episodes.runs.map(run => ({
    rung: run.rung,
    seed: run.seed,
    episodes: run.episodes,
    successes: run.successes,
    rate: round(run.success_rate, 4),
    firstSuccess: run.first_success ? run.first_success.timesteps : null,
    firstSuccessEpisode: run.first_success ? run.first_success.episode : null,
    finalRate: round(run.final_rate_1000, 4),
    bestPeak: round(run.best_peak, 1),
    warps: round(run.mean_warps_last_1000, 1),
    medianLength: run.length_quantiles.q50,
  }));

  const rungs = curves.rungs.map(rung => ({
    name: rung.name,
    title: rung.title,
    subtitle: rung.subtitle,
    solved: rung.solved,
    total: rung.total,
    light: rung.light,
    dark: rung.dark,
    // Curves arrive as [timesteps, value] pairs. Keep that shape; the chart wants xy pairs and
    // the x axis is not uniform across rungs once a run ends early.
    medianRate: rung.median_rate.map(([x, y]) => [x, round(y, 4)]),
    medianReturn: rung.median_return.map(([x, y]) => [x, round(y, 4)]),
    // Return on this task is bimodal, not continuous, so the median across six seeds is not a
    // level anybody reached. These are the two values the seeds actually take: 1.0 for the
    // landing plus whatever the rung's shaping is worth, or the shaping alone.
    returnModes: rung.return_modes,
    seeds: rung.seeds.map(seed => ({
      seed: seed.seed,
      firstSuccess: seed.first_success ? seed.first_success.timesteps : null,
      successes: seed.successes,
      episodes: seed.episodes,
      bestPeak: round(seed.best_peak, 1),
      rate: seed.rate.map(([x, y]) => [x, round(y, 4)]),
    })),
  }));

  const chain = tas.comparisons.castle_area1_longest;
  const validation = {
    movie: tas.reference_movie,
    framesCompared: chain.frames_compared,
    framesBitExact: chain.frames_bit_exact_in_pos_vel_forwardvel,
    actionsMatch: chain.action_sequence_matches_every_frame,
    peakReference: chain.peak_forward_vel_reference,
    peakLibsm64: chain.peak_forward_vel_libsm64,
    knownGaps: tas.verdict.known_gaps,
  };

  const random = occupancy ? occupancy.rows.find(row => row.policy === 'uniform random') : null;

  // Action occupancy across one run's checkpoints. Rows without a step count are the two
  // reference policies (uniform random, untrained network) and are kept separately from the
  // checkpoint curve so the chart's x axis stays a step count.
  const occ = occupancy && {
    frames: occupancy.frames,
    rollouts: occupancy.rollouts,
    rung: occupancy.rung,
    groundPoundActions: occupancy.ground_pound_actions,
    longJumpActions: occupancy.long_jump_actions,
    reference: occupancy.rows
      .filter(row => row.steps === null || row.steps === 0)
      .map(row => ({
        policy: row.policy,
        groundPound: row.ground_pound,
        longJump: row.long_jump,
        bestPeak: row.best_peak,
        medianPeak: row.median_peak,
        bestHeight: row.best_height,
        successes: row.successes,
        episodes: row.episodes,
        topActions: row.top_actions,
      })),
    checkpoints: occupancy.rows
      .filter(row => row.steps)
      .map(row => ({
        steps: row.steps,
        groundPound: row.ground_pound,
        longJump: row.long_jump,
        bestPeak: row.best_peak,
        medianPeak: row.median_peak,
        bestHeight: row.best_height,
        successes: row.successes,
        episodes: row.episodes,
      })),
  };

  // What the loop actually runs at, for the pipeline diagram's own labels. The loop rate is
  // fitted across runs of different lengths rather than timed, because spawning one libsm64
  // subprocess per environment and loading the ROM into each is a fixed cost a short run cannot
  // separate from the stepping — which is how the old 2,500 figure happened.
  const speed = throughput && {
    machine: throughput.machine,
    envs: throughput.trainEnvs,
    single: round(throughput.environment.stepsPerSecond, 0),
    loop: round(throughput.loop.stepsPerSecond, 0),
    startupSeconds: throughput.loop.startupSeconds,
    fitResidualSeconds: throughput.loop.fitResidualSeconds,
    runs: throughput.loop.runs.map(row => ({
      steps: row.steps,
      stepsPerSecond: round(row.stepsPerSecond, 0),
    })),
  };

  // The filmed episode, reduced to the events the prose and the clip cuts both refer to. Cutting
  // footage on these frames rather than on round numbers is the difference between a clip that
  // shows the escape and a clip that happens to contain it.
  const escapeOf = () => {
    if (!replay) return null;
    const frames = replay.frames;
    const at = frame => frames.find(row => row.frame === frame);
    // The warp fires on the frame whose sampled floor is a trigger, and the displacement lands on
    // the frame after it, so each event is read as a pair.
    const warps = frames
      .filter(row => row.warped)
      .map(row => {
        const next = at(row.frame + 1);
        return {
          frame: row.frame,
          velocity: round(row.forward_velocity, 2),
          from: [round(row.position[1], 1), round(row.position[2], 1)],
          to: next ? [round(next.position[1], 1), round(next.position[2], 1)] : null,
        };
      });

    const peakFrame = frames.reduce((best, row) =>
      row.forward_velocity < best.forward_velocity ? row : best);
    const landing = frames.find(row => row.position[1] >= replay.goal_y);
    const lastWarp = frames.filter(row => row.warped).at(-1);

    // INPUT_A_PRESSED is an edge, so a chain is a sequence of press frames with a release between
    // them, and a press frame's amplification is measured against the frame before it rather than
    // against the previous press.
    const describe = row => {
      const prev = at(row.frame - 1);
      const next = at(row.frame + 1);
      return {
        frame: row.frame,
        velocity: round(row.forward_velocity, 2),
        ratio: prev && prev.forward_velocity !== 0
          ? round(row.forward_velocity / prev.forward_velocity, 3) : null,
        z: next ? round(next.position[2], 1) : null,
        y: next ? round(next.position[1], 1) : null,
        // The crossing frame is the one whose displacement carries Mario over the whole band,
        // from above its far edge to below its near one, so the once-per-frame floor sample
        // never lands on a trigger triangle.
        crossed: next ? row.position[2] > BAND_Z[1] && next.position[2] < BAND_Z[0] : false,
      };
    };

    const pressed = frames
      .filter(row => row.frame > lastWarp.frame && row.frame <= peakFrame.frame && row.inputs.a === 1)
      .map(describe);

    // Two frames are worth naming separately. The chain leaves the -16 air attractor at the first
    // press that amplifies rather than pays drag, and it becomes the escape at the first press of
    // the run over which speed grows monotonically all the way to the peak.
    const launch = pressed.find(row => row.ratio !== null && row.ratio >= 1.3) ?? pressed[0];
    let startIndex = pressed.length - 1;
    while (startIndex > 0 && pressed[startIndex - 1].velocity > pressed[startIndex].velocity) {
      startIndex -= 1;
    }
    const start = pressed[startIndex].frame;

    // The table shows the monotone run, plus the drag frame inside it that does the crossing.
    const presses = frames
      .filter(row => row.frame >= start && row.frame <= peakFrame.frame
        && (row.inputs.a === 1 || describe(row).crossed))
      .map(describe);

    // A warp that fired on a frame already faster than the escape speed. There is one, and it is
    // the whole argument that speed alone does not buy the crossing.
    const inPhase = warps.find(warp => Math.abs(warp.velocity) > env.minimum_escape_speed) ?? null;

    // Its counterpart, three frames later in the same chain on the same flight: the first frame
    // after that warp whose displacement steps over the whole band. The pair is what the slow
    // motion's first beat shows — one landing inside the band at a speed that should have been
    // enough, one clearing it entirely a few frames later.
    const clearing = inPhase
      ? frames.find(row => row.frame > inPhase.frame && describe(row).crossed)
      : null;
    const clears = clearing
      ? {
          frame: clearing.frame,
          velocity: round(clearing.forward_velocity, 2),
          from: round(clearing.position[2], 1),
          to: round(at(clearing.frame + 1).position[2], 1),
        }
      : null;

    return {
      frames: frames.length,
      goalY: replay.goal_y,
      peak: round(replay.peak_velocity, 2),
      band: { zLow: BAND_Z[0], zHigh: BAND_Z[1], depth: BAND_Z[1] - BAND_Z[0] },
      warpCount: replay.warps,
      warps,
      chain: {
        launch: launch.frame,
        start,
        peakFrame: peakFrame.frame,
        escapeFrame: presses.find(row => row.crossed)?.frame ?? null,
        landingFrame: landing ? landing.frame : null,
        cycles: presses.filter(row => row.ratio !== null && row.ratio >= 1.3).length,
      },
      presses,
      inPhase,
      clears,
    };
  };
  const escape = escapeOf();


  // Transfer test: all 24 final policies dropped on ten flights of stairs, unchanged, to separate
  // "the policy learned the exploit" from "the policy learned this staircase". Rows are per-scene.
  // The rate column is the mean success rate over the ten policies that solve the castle at all,
  // because averaging over policies that never solved anything drags every row toward zero and
  // hides the split between transfer failure and policy failure. "policiesSolving" is the count of
  // the 24 whose success rate on the scene is above zero.
  const transferSummary = () => {
    if (!transfer) return null;
    const runsByScene = {};
    const runsByPolicy = {};
    for (const run of transfer.runs) {
      (runsByScene[run.scene] ??= []).push(run);
      const policyKey = `${run.rung}-${run.seed}`;
      (runsByPolicy[policyKey] ??= {})[run.scene] = run;
    }
    const successRate = run =>
      run.episodes.filter(ep => ep.success).length / run.episodes.length;
    const castleSolvers = Object.entries(runsByPolicy)
      .filter(([, byScene]) => byScene.castle && successRate(byScene.castle) > 0)
      .map(([key]) => key);

    const rows = Object.entries(transfer.scenes).map(([name, meta]) => {
      const sceneRuns = runsByScene[name] ?? [];
      const rates = sceneRuns.map(successRate);
      const policiesSolving = rates.filter(rate => rate > 0).length;
      const castleSolverRates = sceneRuns
        .filter(run => castleSolvers.includes(`${run.rung}-${run.seed}`))
        .map(successRate);
      const meanRate = castleSolverRates.length
        ? castleSolverRates.reduce((sum, r) => sum + r, 0) / castleSolverRates.length
        : 0;
      const peaks = sceneRuns.flatMap(run =>
        run.episodes.map(ep => ep.peak_backward_velocity).filter(v => v !== null));
      const bestPeak = peaks.length ? Math.min(...peaks) : 0;
      return {
        scene: name,
        rise: meta.rise,
        run: meta.run,
        risers: meta.risers,
        synthetic: meta.synthetic,
        triangles: meta.triangles,
        escapeSpeed: meta.escape_speed,
        policiesSolving,
        totalPolicies: sceneRuns.length,
        meanRate: round(meanRate, 3),
        bestPeak: round(bestPeak, 1),
      };
    });

    return {
      episodesPerRun: transfer.episodes_per_run,
      totalPolicies: Object.keys(runsByPolicy).length,
      castleSolvers: castleSolvers.length,
      rows,
    };
  };

  // The project's hand-written scripted expert run against the same ten scenes: a fixed action
  // program that "should" work if the exploit is purely a physics property. It runs away on
  // exactly the two flights with no risers and a steep rise, which proves those admit a chain, and
  // fails on the castle where ten learned policies succeed — so its successes are informative
  // about the geometry and its failures are informative about the fixed program, not the game.
  const expertSummary = () => {
    if (!transferExpert) return null;
    return {
      runawayThreshold: transferExpert.runaway_threshold,
      rows: Object.values(transferExpert.best_per_scene).map(row => ({
        scene: row.scene,
        peak: round(row.peak_velocity, 1),
        minAirFrames: row.min_air_frames,
        runaway: row.runaway,
      })),
    };
  };

  return {
    escapeSpeed: env.minimum_escape_speed,
    curveBin: curves.bin,
    heightOverTerminal: curves.height_over_terminal,
    totals: {
      episodes: episodes.total_episodes,
      successes: episodes.total_successes,
      maxTimesteps: episodes.max_timesteps,
    },
    seeds,
    rungs,
    validation,
    media,
    randomPolicy: random ? random.rollouts : null,
    escape,
    speed,
    swarm: swarmManifest,
    occupancy: occ,
    transfer: transferSummary(),
    transferExpert: expertSummary(),
  };
}

const targets = [
  ['components/post/results/simdjson.json', distillSimd],
  ['components/post/results/mario.json', distillMario],
];

for (const [out, build] of targets) {
  try {
    writeFileSync(resolve(root, out), JSON.stringify(build(), null, 2) + '\n');
    console.log(`wrote ${out}`);
  } catch (error) {
    console.error(`skipped ${out}: ${error.message}`);
  }
}
