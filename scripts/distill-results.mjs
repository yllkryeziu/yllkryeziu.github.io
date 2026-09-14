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

const targets = [
  ['components/post/results/prefetch.json', distillPrefetch],
  ['components/post/results/simdjson.json', distillSimd],
  ['components/post/results/secret.json', distillSecret],
];

for (const [out, build] of targets) {
  try {
    writeFileSync(resolve(root, out), JSON.stringify(build(), null, 2) + '\n');
    console.log(`wrote ${out}`);
  } catch (error) {
    console.error(`skipped ${out}: ${error.message}`);
  }
}
