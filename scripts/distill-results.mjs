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

function stat(node, digits = 2) {
  if (!node || node.mean === null || node.mean === undefined) return null;
  return { mean: round(node.mean, digits), lo: round(node.ci_low, digits), hi: round(node.ci_high, digits), n: node.n };
}

function distillPrefetch() {
  const headline = read('projects/jax-prefetch/results/headline.json');
  const experiment = read('projects/jax-prefetch/results/experiment.json');
  const stats = read('projects/jax-prefetch/results/dataset_stats.json');
  const predictor = read('projects/jax-prefetch/results/predictor_nasa.json');
  const sweep = readIf('projects/jax-prefetch/results/regime_sweep.json');
  const latency = readIf('projects/jax-prefetch/results/latency_sweep.json');
  const edge = readIf('projects/jax-prefetch/results/experiment_edge.json');

  const strategyRows = source => source.main.map(row => ({
    regime: row.regime,
    concurrency: row.origin_concurrency,
    strategy: row.strategy,
    p95: stat(row.latency_ms_p95, 1),
    p99: stat(row.latency_ms_p99, 1),
    p50: stat(row.latency_ms_p50, 1),
    hitRate: stat(row.cache_hit_rate, 4),
    extraLoad: stat(row.extra_origin_requests_fraction, 4),
    wasted: stat(row.wasted_prefetch_fraction, 4),
    precision: stat(row.prefetch_precision, 4),
  }));

  const strategies = experiment.main.map(row => ({
    regime: row.regime,
    concurrency: row.origin_concurrency,
    strategy: row.strategy,
    p95: stat(row.latency_ms_p95, 1),
    p99: stat(row.latency_ms_p99, 1),
    p50: stat(row.latency_ms_p50, 1),
    hitRate: stat(row.cache_hit_rate, 4),
    extraLoad: stat(row.extra_origin_requests_fraction, 4),
    wasted: stat(row.wasted_prefetch_fraction, 4),
    precision: stat(row.prefetch_precision, 4),
  }));

  const matched = experiment.matched_load_comparison.map(row => ({
    regime: row.regime,
    concurrency: row.origin_concurrency,
    reference: row.reference_strategy,
    referenceLoad: stat(row.reference_extra_origin_fraction, 4),
    referenceP95: stat(row.reference_p95_ms, 1),
    matchedAlpha: row.matched_alpha,
    matchedLoad: stat(row.matched_extra_origin_fraction, 4),
    matchedP95: stat(row.matched_p95_ms, 1),
  }));

  const loadResponse = experiment.load_response_validation.map(row => ({
    regime: row.regime,
    timeScale: row.time_scale,
    concurrency: row.origin_concurrency,
    offeredRps: stat(row.offered_requests_per_second, 1),
    originRps: stat(row.origin_requests_per_second, 1),
    queue: stat(row.mean_origin_queue_length_at_submit, 2),
    p95: stat(row.latency_ms_p95, 1),
  }));

  return {
    environment: experiment.environment,
    config: experiment.config,
    trace: headline.dataset,
    sessions: stats.splits,
    responseBytes: stats.response_bytes,
    vocabulary: stats.vocabulary,
    predictorNasa: headline.predictor_nasa_test,
    reliability: Object.fromEntries(
      Object.entries(predictor.test).map(([model, row]) => [
        model,
        (row.reliability_curve ?? []).map(bin => ({
          confidence: round(bin.mean_confidence, 4),
          accuracy: round(bin.empirical_accuracy, 4),
          count: bin.count,
        })),
      ])
    ),
    calibrationBins: predictor.test.jax_mlp.calibration_bins,
    predictorMsnbc: headline.predictor_msnbc_test,
    modelCost: headline.model_cost,
    gateCosts: headline.simulator.gate_costs,
    serviceModel: headline.simulator.service_model,
    alphaSelection: headline.simulator.alpha_selection.map(row => ({
      regime: row.regime,
      concurrency: row.origin_concurrency,
      alpha: row.selected_alpha,
    })),
    strategies,
    matched,
    loadResponse,
    edge: edge && {
      config: edge.config,
      strategies: strategyRows(edge),
      matched: edge.matched_load_comparison.map(row => ({
        regime: row.regime,
        concurrency: row.origin_concurrency,
        reference: row.reference_strategy,
        referenceLoad: stat(row.reference_extra_origin_fraction, 4),
        referenceP95: stat(row.reference_p95_ms, 1),
        matchedAlpha: row.matched_alpha,
        matchedLoad: stat(row.matched_extra_origin_fraction, 4),
        matchedP95: stat(row.matched_p95_ms, 1),
      })),
      alphaSelection: edge.alpha_selection.map(row => ({
        regime: row.regime,
        concurrency: row.origin_concurrency,
        alpha: row.selected_alpha,
      })),
      paired: edge.paired_vs_no_prefetch.map(row => ({
        regime: row.regime,
        concurrency: row.origin_concurrency,
        strategy: row.strategy,
        deltaP95: stat(row.delta_latency_ms_p95, 1),
        deltaP99: stat(row.delta_latency_ms_p99, 1),
      })),
    },
    latency: latency && {
      config: latency.config,
      totalRuns: latency.total_runs,
      rows: latency.rows.map(row => ({
        originMs: row.origin_base_milliseconds,
        capacity: row.cache_capacity_entries,
        timeScale: row.time_scale,
        concurrency: row.origin_concurrency,
        baselineP95: stat(row.baseline_p95_ms, 1),
        costAware: {
          p95: stat(row.cost_aware.p95_ms, 1),
          delta: stat(row.cost_aware.delta_p95_ms, 1),
          precision: stat(row.cost_aware.prefetch_precision, 4),
          alpha: row.cost_aware_best_alpha,
        },
        naive: {
          p95: stat(row.always_top1.p95_ms, 1),
          delta: stat(row.always_top1.delta_p95_ms, 1),
        },
      })),
    },
    sweep: sweep && {
      config: sweep.config,
      totalRuns: sweep.total_runs,
      verdict: (() => {
        const sig = row => row.strategies.cost_aware_mlp.delta_p95_ms;
        const wins = sweep.rows.filter(row => sig(row).ci_high < 0);
        const losses = sweep.rows.filter(row => sig(row).ci_low > 0);
        const span = subset => ({
          lo: round(Math.min(...subset.map(row => row.baseline_p95_ms.mean)), 1),
          hi: round(Math.max(...subset.map(row => row.baseline_p95_ms.mean)), 1),
        });
        return {
          winCount: wins.length,
          lossCount: losses.length,
          winBaselineSpan: span(wins),
          lossBaselineSpan: span(losses),
          bestSavingMs: round(Math.max(...wins.map(row => -sig(row).mean)), 2),
          worstDamageMs: round(Math.max(...losses.map(row => sig(row).mean)), 1),
        };
      })(),
      rows: sweep.rows.map(row => ({
        capacity: row.cache_capacity_entries,
        ttl: row.cache_ttl_seconds,
        timeScale: row.time_scale,
        concurrency: row.origin_concurrency,
        baselineP95: stat(row.baseline_p95_ms, 1),
        baselineHit: stat(row.baseline_cache_hit_rate, 4),
        costAware: {
          p95: stat(row.strategies.cost_aware_mlp.p95_ms, 1),
          delta: stat(row.strategies.cost_aware_mlp.delta_p95_ms, 1),
          hit: stat(row.strategies.cost_aware_mlp.cache_hit_rate, 4),
          precision: stat(row.strategies.cost_aware_mlp.prefetch_precision, 4),
          extraLoad: stat(row.strategies.cost_aware_mlp.extra_origin_requests_fraction, 4),
        },
        naive: {
          p95: stat(row.strategies.always_top1.p95_ms, 1),
          delta: stat(row.strategies.always_top1.delta_p95_ms, 1),
          hit: stat(row.strategies.always_top1.cache_hit_rate, 4),
          precision: stat(row.strategies.always_top1.prefetch_precision, 4),
          extraLoad: stat(row.strategies.always_top1.extra_origin_requests_fraction, 4),
        },
      })),
    },
  };
}

function distillSimd() {
  const environment = readIf('projects/simdjson-jni/results/environment.json');
  const equivalence = readIf('projects/simdjson-jni/results/equivalence.json');
  const summary = readIf('projects/simdjson-jni/results/summary.json');
  if (!environment || !equivalence || !summary) {
    throw new Error('simdjson benchmark has not produced a complete run yet');
  }
  return { environment, equivalence, summary };
}

function distillSecret() {
  const root = 'projects/latent-commitment/results/';
  const elicitation = readIf(`${root}elicitation.json`);
  const probe = readIf(`${root}probe_subset10.json`);
  const control = readIf(`${root}control_subset10.json`);
  const controlFull = readIf(`${root}control.json`);
  const analysis = readIf(`${root}analysis.json`);
  const steering = readIf(`${root}steering.json`);
  const arms = {};
  for (const tag of ['greedy', 'sampled', 'sampled_t1', 'random', 'subset10']) {
    const row = readIf(`${root}play_${tag}.json`);
    if (row) {
      arms[tag] = {
        temperature: row.temperature,
        questioner: row.questioner,
        games: row.games,
        turns: row.turns,
        subsetSize: row.subset_size ?? null,
        contradicted: round(row.contradicted_fraction, 4),
        medianDeathTurn: row.median_death_turn,
        revealConsistent: round(row.reveal_consistent_fraction, 4),
        survival: row.survival_curve.map(s => ({ turn: s.turn, alive: round(s.alive_fraction, 4) })),
        distinctReveals: Object.keys(row.reveal_distribution).length,
      };
    }
  }
  if (!elicitation || !probe || !control || Object.keys(arms).length === 0) {
    throw new Error('latent-commitment has not produced a complete run yet');
  }
  return { elicitation, probe, control, controlFull, analysis, arms, steering };
}

function distillMario() {
  const root = 'projects/mario-blj/results/';
  const episodes = read(`${root}episode_stats.json`);
  const curves = read(`${root}curves_page.json`);
  const media = read(`${root}media_summary.json`);
  const tas = read(`${root}tas_validation.json`);
  const env = read(`${root}env_validation.json`);
  const occupancy = readIf(`${root}action_occupancy.json`);
  const runaway = readIf(`${root}blj_runaway.json`);

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

  // Scripted probe of the chain condition across 15 floor shapes at four stick magnitudes. The
  // table the post shows is the full deflection slice; the magnitude summary is what justifies
  // restricting the action space to full deflection rather than treating that as a simplification.
  const magnitudes = runaway
    ? [...new Set(runaway.runs.map(row => row.air_stick_magnitude))].sort((a, b) => a - b)
    : [];
  const geometry = runaway && {
    approachStick: runaway.approach_stick,
    full: runaway.runs
      .filter(row => row.air_stick_magnitude === 1)
      .map(row => ({
        geometry: row.geometry,
        degrees: row.envelope_degrees,
        cycles: row.cycles,
        backwardsCycles: row.backwards_cycles,
        peak: row.peak_velocity,
        launch: row.best_launch_velocity,
        minAirFrames: row.min_air_frames,
        meanAirFrames: row.mean_air_frames,
        runaway: row.runaway,
      })),
    byMagnitude: magnitudes.map(magnitude => {
      const rows = runaway.runs.filter(row => row.air_stick_magnitude === magnitude);
      return {
        magnitude,
        total: rows.length,
        runaway: rows.filter(row => row.runaway).length,
        bestPeak: Math.min(...rows.map(row => row.peak_velocity)),
      };
    }),
  };

  return {
    escapeSpeed: env.minimum_escape_speed,
    curveBin: curves.bin,
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
    occupancy: occ,
    geometry,
  };
}

const targets = [
  ['components/post/results/prefetch.json', distillPrefetch],
  ['components/post/results/simdjson.json', distillSimd],
  ['components/post/results/secret.json', distillSecret],
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
