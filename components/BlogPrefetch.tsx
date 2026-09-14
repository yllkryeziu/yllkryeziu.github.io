import React from 'react';
import Article, { H2, H3, Note, KeyNumbers } from './post/Article';
import Figure from './post/Figure';
import Table from './post/Table';
import Code from './post/Code';
import { M, Eq } from './post/Math';
import References, { makeCite } from './post/References';
import { BarChart, GroupedBarChart } from './post/Charts';
import { SystemFigure, DecisionFigure, ReliabilityFigure } from './post/PrefetchFigures';
import { JAX_REFS, JAX_BIBTEX } from './post/refsJax';
import { POST_BY_SLUG } from './post/posts';
import results from './post/results/prefetch.json';

const Cite = makeCite(JAX_REFS);
const meta = POST_BY_SLUG.jax;

const TOC = [
  { id: 'the-bet', label: 'The cost of a speculative fetch' },
  { id: 'workload', label: 'Choosing a workload' },
  { id: 'limits', label: 'What a 1995 trace can and cannot tell you' },
  { id: 'predictor', label: 'Predicting the next request' },
  { id: 'baselines', label: 'The baseline is the experiment' },
  { id: 'calibration', label: 'Why calibration matters more than accuracy' },
  { id: 'policy', label: 'Pricing the bet' },
  { id: 'simulator', label: 'A simulator where prefetching can hurt' },
  { id: 'results', label: 'Where prefetching pays' },
  { id: 'matched', label: 'What the origin distance is worth' },
  { id: 'sweep', label: 'Mapping the boundary' },
  { id: 'takeaway', label: 'Limitations and what I would change' },
];

const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const ms = (value: number, digits = 0) => value.toFixed(digits);
const num = (value: number) => value.toLocaleString('en-US');

type Stat = { mean: number; lo: number; hi: number; n: number };

function strategyRow(regime: string, concurrency: number, strategy: string) {
  return results.strategies.find(
    row => row.regime === regime && row.concurrency === concurrency && row.strategy === strategy,
  )!;
}

function matchedRow(regime: string, concurrency: number, reference: string) {
  return results.matched.find(
    row => row.regime === regime && row.concurrency === concurrency && row.reference === reference,
  )!;
}

const HEADLINE_REGIME = 'small_cache';
const HEADLINE_CONCURRENCY = 8;

const baseline = strategyRow(HEADLINE_REGIME, HEADLINE_CONCURRENCY, 'none');
const naiveTop2 = strategyRow(HEADLINE_REGIME, HEADLINE_CONCURRENCY, 'always_top2');
const costAware = strategyRow(HEADLINE_REGIME, HEADLINE_CONCURRENCY, 'cost_aware_mlp');
const matchedTop1 = matchedRow(HEADLINE_REGIME, HEADLINE_CONCURRENCY, 'always_top1');

const naivePenalty = (naiveTop2.p95!.mean - baseline.p95!.mean) / baseline.p95!.mean;
const costAwarePenalty = (costAware.p95!.mean - baseline.p95!.mean) / baseline.p95!.mean;
const matchedGain = (matchedTop1.matchedP95!.mean - matchedTop1.referenceP95!.mean) / matchedTop1.referenceP95!.mean;

const sweepRows = results.sweep!.rows;

function relativeDeltas(strategy: 'costAware' | 'naive') {
  return sweepRows.map(row => row[strategy].delta!.mean / row.baselineP95!.mean);
}

function regret(strategy: 'costAware' | 'naive') {
  const deltas = relativeDeltas(strategy);
  const sorted = [...deltas].sort((a, b) => a - b);
  return {
    worst: Math.max(...deltas),
    best: Math.min(...deltas),
    median: sorted[Math.floor(sorted.length / 2)],
    wins: sweepRows.filter(row => row[strategy].delta!.hi < 0).length,
    losses: sweepRows.filter(row => row[strategy].delta!.lo > 0).length,
  };
}

const verdict = results.sweep!.verdict;
const costAwareRegret = regret('costAware');
const naiveRegret = regret('naive');

const byCapacity = [...new Set(sweepRows.map(row => row.capacity))].sort((a, b) => a - b).map(capacity => {
  const subset = sweepRows.filter(row => row.capacity === capacity);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    capacity,
    precision: mean(subset.map(row => row.costAware.precision!.mean)),
    baselineHit: mean(subset.map(row => row.baselineHit!.mean)),
    baselineP95: mean(subset.map(row => row.baselineP95!.mean)),
    costAwareDelta: mean(subset.map(row => row.costAware.delta!.mean / row.baselineP95!.mean)),
    naiveDelta: mean(subset.map(row => row.naive.delta!.mean / row.baselineP95!.mean)),
  };
});

const EDGE_CELLS = [
  { regime: 'edge_small', concurrency: 16, label: '256 / 16' },
  { regime: 'edge_warm', concurrency: 16, label: '1024 / 16' },
  { regime: 'edge_warm', concurrency: 64, label: '1024 / 64' },
];

function edgeRow(regime: string, concurrency: number, strategy: string) {
  return results.edge!.strategies.find(
    row => row.regime === regime && row.concurrency === concurrency && row.strategy === strategy,
  )!;
}

function edgeDelta(regime: string, concurrency: number, strategy: string) {
  const treatment = edgeRow(regime, concurrency, strategy);
  const control = edgeRow(regime, concurrency, 'none');
  return (treatment.p95!.mean - control.p95!.mean) / control.p95!.mean;
}

const byOriginLatency = results.latency!.config.origin_base_milliseconds.map(originMs => {
  const cells = results.latency!.rows.filter(
    row => row.originMs === originMs && row.concurrency / (originMs / 1000) > 450,
  );
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    originMs,
    cells: cells.length,
    baselineP95: mean(cells.map(row => row.baselineP95!.mean)),
    relative: mean(cells.map(row => row.costAware.delta!.mean / row.baselineP95!.mean)),
    absolute: mean(cells.map(row => row.costAware.delta!.mean)),
  };
}).filter(row => row.cells > 0);

const STRATEGY_LABEL: Record<string, string> = {
  none: 'No prefetch',
  always_top1: 'Always top-1',
  always_top2: 'Always top-2',
  markov1_top2: 'Markov top-2',
  static_rule: 'Static rule',
  cost_aware_mlp: 'Cost-aware (JAX)',
};

const STRATEGY_ORDER = ['none', 'always_top1', 'always_top2', 'markov1_top2', 'static_rule', 'cost_aware_mlp'];

const MODEL_LABEL: Record<string, string> = {
  most_frequent: 'Most frequent',
  markov_order1: 'Markov, order 1',
  markov_order2_backoff: 'Markov, order 2 + back-off',
  jax_mlp: 'JAX MLP',
};

const FORWARD_PASS = `def forward_single(params, current, previous, previous_two,
                   position, inter_arrival, hour, size, scalars):
    features = jnp.concatenate([
        params.path_embedding[current],
        params.path_embedding[previous],
        params.path_embedding[previous_two],
        params.position_embedding[position],
        params.inter_arrival_embedding[inter_arrival],
        params.hour_embedding[hour],
        params.size_embedding[size],
        scalars,
    ])
    hidden = jnp.tanh(features @ params.hidden_weights + params.hidden_bias)
    return hidden @ params.output_weights + params.output_bias


forward_batch = jax.vmap(forward_single, in_axes=(None, 0, 0, 0, 0, 0, 0, 0, 0))`;

const GATE = `service_milliseconds = self.service_model.expected_milliseconds(
    self.predicted_bytes[path_index]
)
latency_saved = service_milliseconds - self.service_model.cache_hit_milliseconds
expected_gain = probability * latency_saved

congestion = 1.0 + state.queue_length / max(1, state.concurrency)
backend_cost = service_milliseconds * congestion
cache_cost = self.config.cache_pressure_milliseconds * state.cache_occupancy
waste_cost = self.config.waste_penalty_milliseconds * (1.0 - probability)
expected_cost = backend_cost + cache_cost + waste_cost

if expected_gain <= self.config.alpha * expected_cost:
    self.counters.rejected_expected_value += 1
    continue`;

const BlogPrefetch: React.FC<{ onBack: () => void }> = ({ onBack }) => (
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
    <KeyNumbers
      items={[
        {
          k: 'p95, origin provisioned',
          v: pct(edgeDelta('edge_warm', 64, 'cost_aware_mlp')),
          s: `matching always-top-2 at ${pct(edgeDelta('edge_warm', 64, 'always_top2'))} for less origin load`,
        },
        {
          k: 'p95, origin saturated',
          v: pct(edgeDelta('edge_small', 16, 'cost_aware_mlp')),
          s: `where always-top-2 reaches ${pct(edgeDelta('edge_small', 16, 'always_top2'), 0)}`,
        },
        {
          k: 'saving at a 400 ms origin',
          v: `${ms(Math.abs(byOriginLatency[byOriginLatency.length - 1].absolute), 1)} ms`,
          s: 'absolute p95 reduction scales with origin distance',
        },
      ]}
    />

    <H2 id="the-bet">The cost of a speculative fetch</H2>
    <p>
      Prefetching is an old idea<Cite ids={[1]} />: guess what the user will ask for next, fetch it early,
      serve it from cache. Descriptions of the idea usually stop there, which leaves out that every
      speculative fetch is a real request the origin has to absorb, whether or not anyone ever wanted it.
    </p>
    <p>
      At low load this goes unnoticed. At high load the prefetcher is spending the scarcest resource in the
      system on a guess that is usually wrong, at the moment the system can least afford it. Naive
      prefetching is therefore a tail-latency hazard before it is a throughput
      optimisation<Cite ids={[2]} />.
    </p>
    <p>
      The question worth asking is narrower than "can I predict the next request". It is whether a
      particular prefetch is worth what it costs. That is a question about expected value, and expected
      value requires a calibrated probability rather than an argmax.
    </p>
    <p>
      This post works through the whole calculation on a real trace: the predictor, the cost model, a
      simulator in which speculation can genuinely hurt, and sweeps over cache capacity and origin distance
      to locate the boundary between the regime where speculation pays and the regime where it is dangerous.
    </p>

    <H2 id="workload">Choosing a workload</H2>
    <p>
      Generating a workload from a transition matrix and then fitting a model to it proves only that the
      model can learn the generator. Prefetching systems evaluated this way look uniformly excellent, which
      is a good reason to distrust the evaluation rather than admire the system.
    </p>
    <p>
      The workload here is the NASA Kennedy Space Center HTTP log for July and August 1995, from the
      Internet Traffic Archive<Cite ids={[4]} />: a real server, real users, real timestamps, and real
      response sizes. It is also one of the most thoroughly characterised workloads in the
      literature<Cite ids={[3]} />, which makes it easy to check that the preprocessing is sane.
    </p>
    <p>
      Two months of data buys a split that means something. The model is fit on July and evaluated on
      August. There is no shuffling, no leakage of August statistics into July, and no session that straddles
      the boundary: {results.trace.sessions_dropped_straddling_boundary} such sessions were dropped rather
      than split.
    </p>

    <Table
      n={1}
      caption={
        <>
          The trace after parsing and sessionisation. Requests are successful <code>GET</code>s of page-like
          resources. Excluding embedded assets is a modelling choice and not a neutral one, so the fraction
          removed is reported here rather than buried in the code.
        </>
      }
      columns={[
        { key: 'metric', label: 'Metric' },
        { key: 'july', label: 'July (train)', numeric: true },
        { key: 'august', label: 'August (test)', numeric: true },
      ]}
      rows={[
        { metric: 'Raw log lines', july: num(results.trace.nasa_july_raw_lines), august: num(results.trace.nasa_august_raw_lines) },
        { metric: 'Page-like requests kept', july: num(results.trace.page_like_requests_july), august: num(results.trace.page_like_requests_august) },
        { metric: 'Asset requests removed', july: pct(results.trace.asset_fraction_removed_july), august: pct(results.trace.asset_fraction_removed_august) },
        { metric: 'Sessions', july: num(results.sessions.train.sessions), august: num(results.sessions.test.sessions) },
        { metric: 'Median session length', july: results.sessions.train.session_length_median, august: results.sessions.test.session_length_median },
        { metric: 'p95 session length', july: results.sessions.train.session_length_p95, august: results.sessions.test.session_length_p95 },
        { metric: 'Singleton sessions', july: pct(results.sessions.train.singleton_session_fraction), august: pct(results.sessions.test.singleton_session_fraction) },
        { metric: 'Median think time', july: `${results.sessions.train.think_time_median_seconds} s`, august: `${results.sessions.test.think_time_median_seconds} s` },
      ]}
    />

    <p>
      Two rows of that table shape everything downstream. Sessions are short: the median is two requests,
      and {pct(results.sessions.test.singleton_session_fraction, 0)} of August sessions are singletons, in
      which there is no next request to predict at all. An accuracy number is only interpretable if it says
      how those are handled, so every figure below reports accuracy over non-terminal decision points
      alongside accuracy over all of them.
    </p>
    <p>
      Think times are long: a median of {results.sessions.test.think_time_median_seconds} seconds leaves
      ample room for a speculative fetch to complete before it is needed. Prefetching only makes sense when
      think time exceeds fetch time, and here it does by a wide margin.
    </p>

    <H2 id="limits">What a 1995 trace can and cannot tell you</H2>
    <p>
      The limits of this trace bound what the rest of the post can claim, so they belong here rather
      than in a footnote.
    </p>
    <p>
      It <em>can</em> tell you about the structure of the problem: heavily skewed resource popularity<Cite ids={[5]} />,
      short sessions, long think times, and most of the next-request probability mass sitting on a handful of
      successors. Those properties are still true of modern traffic, and they are what any prefetcher exploits.
    </p>
    <p>
      It cannot tell you about modern payload sizes, TLS, HTTP/2 multiplexing, or single-page-app
      navigation. The origin here is also simulated; only the workload is real. These latency numbers are
      not predictions about a 2026 production system. What transfers is the shape of the tradeoff and the
      method for pricing it.
    </p>

    <H2 id="predictor">Predicting the next request</H2>
    <p>
      The model answers one question: given what this session has done so far, what is the probability
      distribution over the next resource?
    </p>
    <p>
      Features are restricted to what a gateway knows at decision time: the current path, the previous
      path, the one before that, position in the session, bucketed inter-arrival time, hour of day, and the
      bucketed response size of the current request. Nothing in the feature set encodes the label.
    </p>
    <p>
      The vocabulary is built from the training period only, which matters: building it over the full trace
      would leak August into July. <M>{String.raw`K = 512`}</M> paths plus three special tokens covers{' '}
      {pct(results.vocabulary.chosen_k_coverage)} of training requests, chosen off a coverage curve rather
      than by feel, out of {num(results.vocabulary.distinct_train_paths)} distinct paths.
    </p>

    <Code language="python" file="src/model/mlp.py">{FORWARD_PASS}</Code>

    <p>
      The architecture is deliberately unremarkable: embedding tables for the categoricals, concatenated with
      the scalars, through one hidden layer, and a softmax over the vocabulary. Raw JAX<Cite ids={[7]} /> rather
      than a framework, because the whole model is {num(results.modelCost.parameter_count)} parameters and the
      interesting part is <code>vmap</code> and <code>grad</code>, not layer plumbing. Optimisation is Adam via
      optax<Cite ids={[8]} />, and training takes {results.modelCost.training_seconds.toFixed(0)} seconds on CPU.
    </p>
    <p>
      A transformer would be the wrong tool here. The model runs inline on the request path, so any latency
      it adds is subtracted directly from the latency a prefetch might save. That constraint produces the
      least flattering number in the project, discussed in the takeaway.
    </p>

    <H2 id="baselines">The baseline is the experiment</H2>
    <p>
      A neural model that beats <em>always guess the most popular page</em> has demonstrated nothing. The
      baseline that matters is a Markov chain over the same sessions, because that is what a competent
      engineer would actually ship, and a second-order chain with back-off is genuinely strong. All three
      baselines are fit on July and evaluated on August, exactly like the model, and the back-off weight is
      tuned on a validation split rather than on the test set.
    </p>

    <Table
      n={2}
      caption={
        <>
          August test set, {num(results.sessions.test.requests)} decision points. Cross-entropy is in nats;
          ECE uses {results.calibrationBins} equal-width bins. Non-terminal accuracy excludes decision points
          where the correct answer is end-of-session.
        </>
      }
      columns={[
        { key: 'model', label: 'Model' },
        { key: 'top1', label: 'Top-1', numeric: true },
        { key: 'top3', label: 'Top-3', numeric: true },
        { key: 'nonterm', label: 'Top-1 non-term.', numeric: true },
        { key: 'ce', label: 'Cross-entropy', numeric: true },
        { key: 'ece', label: 'ECE', numeric: true },
      ]}
      rows={Object.entries(results.predictorNasa).map(([key, row]) => ({
        model: MODEL_LABEL[key],
        top1: pct(row.top1_accuracy),
        top3: pct(row.top3_accuracy),
        nonterm: pct(row.non_terminal_top1_accuracy),
        ce: row.cross_entropy_nats.toFixed(3),
        ece: row.expected_calibration_error.toFixed(4),
        highlight: key === 'jax_mlp',
      }))}
    />

    <p>
      The model comes out ahead, though the margin depends on which metric you look at. Against a
      second-order Markov chain it gains{' '}
      {((results.predictorNasa.jax_mlp.top1_accuracy - results.predictorNasa.markov_order2_backoff.top1_accuracy) * 100).toFixed(1)}{' '}
      points of top-1 accuracy and{' '}
      {((results.predictorNasa.jax_mlp.top3_accuracy - results.predictorNasa.markov_order2_backoff.top3_accuracy) * 100).toFixed(1)}{' '}
      points of top-3. Those margins are small enough to be uninteresting on their own. On cross-entropy the gap is clearer
      ({results.predictorNasa.markov_order2_backoff.cross_entropy_nats.toFixed(3)} →{' '}
      {results.predictorNasa.jax_mlp.cross_entropy_nats.toFixed(3)} nats), and on calibration error it is
      better by a factor of{' '}
      {(results.predictorNasa.markov_order2_backoff.expected_calibration_error / results.predictorNasa.jax_mlp.expected_calibration_error).toFixed(1)}.
    </p>

    <Note label="Worth knowing">
      <p>
        Running the same model on the UCI MSNBC dataset<Cite ids={[9]} />, which is also real traffic but
        has 17 page categories instead of 512 URL paths, raises top-1 to{' '}
        {pct(results.predictorMsnbc.jax_mlp.top1_accuracy)} and top-3 to{' '}
        {pct(results.predictorMsnbc.jax_mlp.top3_accuracy)}. Same architecture, same code, much easier
        problem. Next-request accuracy is close to meaningless as a bare number unless the size of the label
        space is stated alongside it.
      </p>
    </Note>

    <H2 id="calibration">Why calibration matters more than accuracy</H2>
    <p>
      A cost gate consumes a probability and multiplies it by a latency saving, so the calibration of that
      probability matters more than the rank of the top prediction. If the model reports 0.4 where the true
      frequency is 0.7, the gate declines bets it should take. If it reports 0.7 where the truth is 0.4, it
      takes bets it should decline. For this purpose a well-calibrated model that is wrong more often can be
      worth more than a sharper model whose confidences are unreliable<Cite ids={[6]} />.
    </p>

    <Figure
      n={1}
      caption={
        <>
          Reliability on the August test set. Points on the diagonal mean the stated probability matches the
          observed frequency. The MLP tracks the diagonal closely across the range that matters for gating:
          at a stated {results.reliability.jax_mlp[3].confidence.toFixed(2)} it is right{' '}
          {results.reliability.jax_mlp[3].accuracy.toFixed(2)} of the time, over{' '}
          {num(results.reliability.jax_mlp[3].count)} decisions.
        </>
      }
    >
      <ReliabilityFigure
        series={[
          { label: 'JAX MLP', bins: results.reliability.jax_mlp, color: 'var(--series-2)' },
          { label: 'Markov, order 2 + back-off', bins: results.reliability.markov_order2_backoff, color: 'var(--series-1)' },
        ]}
      />
    </Figure>

    <H2 id="policy">Pricing the bet</H2>
    <p>
      For every candidate the predictor surfaces, the policy prices it. The gain is the latency the user would
      save, discounted by how likely they are to want it:
    </p>

    <Eq>{String.raw`\mathbb{E}[\text{gain}] = p \cdot \big(t_{\text{origin}} - t_{\text{cache}}\big)`}</Eq>

    <p>
      The cost has three parts: the origin work itself, scaled by how congested the origin currently is; the
      pressure the new entry puts on the cache; and a penalty for being wrong, weighted by how likely that is:
    </p>

    <Eq>{String.raw`\mathbb{E}[\text{cost}] = \underbrace{t_{\text{origin}}\Big(1 + \tfrac{q}{c}\Big)}_{\text{origin, congestion-scaled}} + \underbrace{\kappa\,\omega}_{\text{cache pressure}} + \underbrace{w\,(1-p)}_{\text{cost of being wrong}}`}</Eq>

    <p>
      where <M>{String.raw`q`}</M> is the current origin queue depth, <M>{String.raw`c`}</M> the origin
      concurrency, and <M>{String.raw`\omega`}</M> the cache occupancy. The prefetch fires only when the gain
      clears the cost by a margin <M>{String.raw`\alpha`}</M>, the probability passes a floor, and the session
      still has budget:
    </p>

    <Eq>{String.raw`\text{fire} \iff \mathbb{E}[\text{gain}] > \alpha \cdot \mathbb{E}[\text{cost}]`}</Eq>

    <Code language="python" file="src/policy/gate.py">{GATE}</Code>

    <p>
      The congestion term does most of the work. Because backend cost scales with{' '}
      <M>{String.raw`1 + q/c`}</M>, a prefetch that looks cheap against an idle origin becomes unaffordable
      once the queue builds. The policy never has to be told that the system is under load. It reads load
      off the queue depth and stops betting.
    </p>

    <Figure
      n={2}
      caption={
        <>
          Expected gain rises linearly with <M>{String.raw`p`}</M>. Expected cost falls with{' '}
          <M>{String.raw`p`}</M>, because its dominant term is the penalty for being wrong. The crossing
          point is where speculation begins to pay, and <M>{String.raw`\alpha`}</M> slides that point.
          Drawn with the cost constants derived from the trace:{' '}
          {results.gateCosts.waste_penalty_milliseconds.toFixed(1)} ms waste penalty and{' '}
          {results.gateCosts.cache_pressure_milliseconds.toFixed(1)} ms cache pressure.
        </>
      }
    >
      <DecisionFigure
        latencySaved={results.serviceModel.base_milliseconds + results.gateCosts.source_median_bytes / results.serviceModel.bytes_per_millisecond}
        costUnit={results.gateCosts.cache_pressure_milliseconds}
        wastedPenalty={results.gateCosts.waste_penalty_milliseconds}
        alpha={0.22}
        floor={results.config.probability_floor}
      />
    </Figure>

    <H2 id="simulator">A simulator where prefetching can hurt</H2>
    <p>
      A simulator in which prefetching is free would prove nothing, so the first task was to confirm that
      this one can make things worse.
    </p>

    <Figure
      n={3}
      caption={
        <>
          Real and speculative requests draw from the same finite pool of origin workers. Service time is
          drawn from a distribution fitted to the actual response byte sizes in the trace, not assumed
          constant. The cache is LRU with a TTL and tags prefetched entries, so waste is counted rather than
          inferred.
        </>
      }
      plain
    >
      <SystemFigure />
    </Figure>

    <p>
      Before trusting any result, the no-prefetch baseline has to respond sensibly to load. It does:
    </p>

    <Table
      n={3}
      caption={
        <>
          No-prefetch baseline as offered load rises, small-cache regime. Latency is flat while the origin has
          headroom and climbs sharply once the queue builds, which is the signature of a saturating queue
          rather than a fixed delay. Mean over 7 seeds.
        </>
      }
      columns={[
        { key: 'rps', label: 'Offered req/s', numeric: true },
        { key: 'c4q', label: 'Queue @ c=4', numeric: true },
        { key: 'c4', label: 'p95 @ c=4', numeric: true },
        { key: 'c8', label: 'p95 @ c=8', numeric: true },
        { key: 'c16', label: 'p95 @ c=16', numeric: true },
      ]}
      rows={results.config.load_validation_time_scales.map(scale => {
        const at = (c: number) =>
          results.loadResponse.find(
            row => row.regime === 'small_cache' && row.timeScale === scale && row.concurrency === c,
          )!;
        return {
          rps: ms(at(4).offeredRps!.mean),
          c4q: at(4).queue!.mean.toFixed(1),
          c4: ms(at(4).p95!.mean),
          c8: ms(at(8).p95!.mean),
          c16: ms(at(16).p95!.mean),
        };
      })}
    />

    <H2 id="results">Where prefetching pays</H2>
    <p>
      With the predictor, the policy and the simulator in place, the experiment asks one question:
      across realistic operating points, does pricing a prefetch beat issuing it unconditionally, and
      does either beat doing nothing?
    </p>
    <p>
      The answer depends almost entirely on one parameter I initially set without thinking:{' '}
      <strong>how far away the origin is</strong>. A prefetch saves, at most, the origin round trip. If the
      origin sits in the same rack, that is a few tens of milliseconds and there is little to win. If the
      origin is across an ocean or at the far end of a mobile network, the same correct prediction is worth
      an order of magnitude more. So the experiment is run under two documented profiles rather than one.
    </p>

    <Table
      n={4}
      caption={
        <>
          The two deployment profiles. Both replay the same August sessions through the same predictor and
          the same policy. Only the origin distance, cache size and origin concurrency differ.
        </>
      }
      columns={[
        { key: 'k', label: 'Parameter' },
        { key: 'dc', label: 'datacenter', numeric: true },
        { key: 'edge', label: 'edge', numeric: true },
      ]}
      rows={[
        { k: 'Origin base latency', dc: `${results.serviceModel.base_milliseconds} ms`, edge: `${results.edge!.config.origin_base_milliseconds} ms` },
        { k: 'Cache sizes (entries)', dc: '32, 256', edge: '256, 1024' },
        { k: 'Origin concurrency', dc: results.config.concurrency_levels.join(', '), edge: results.edge!.config.concurrency_levels.join(', ') },
        { k: 'Distinct paths in trace', dc: num(results.vocabulary.distinct_train_paths), edge: num(results.vocabulary.distinct_train_paths) },
      ]}
    />

    <p>
      Under the edge profile, with the origin {results.edge!.config.origin_base_milliseconds} ms away,
      speculation pays. Table 5 gives every strategy at every operating point.{' '}
      <M>{String.raw`\alpha`}</M> was selected on the five validation seeds and never on the seven test
      seeds reported here.
    </p>

    <Table
      n={5}
      caption={
        <>
          Edge profile, mean over 7 test seeds. Δp95 is measured against the same seeds with prefetching
          disabled. Extra origin load counts every additional request the origin served, speculative or not.
          The two rows to compare are the saturated case (256-entry cache, 16 workers) and the provisioned
          case (1024-entry cache, 64 workers).
        </>
      }
      columns={[
        { key: 'regime', label: 'Cache / workers' },
        { key: 'strategy', label: 'Strategy' },
        { key: 'p95', label: 'p95 (ms)', numeric: true },
        { key: 'delta', label: 'Δp95', numeric: true },
        { key: 'load', label: 'Extra origin', numeric: true },
      ]}
      rows={EDGE_CELLS.flatMap(cell =>
        STRATEGY_ORDER.map((strategy, index) => {
          const row = edgeRow(cell.regime, cell.concurrency, strategy);
          const control = edgeRow(cell.regime, cell.concurrency, 'none');
          const delta = (row.p95!.mean - control.p95!.mean) / control.p95!.mean;
          return {
            regime: index === 0 ? cell.label : '',
            strategy: STRATEGY_LABEL[strategy],
            p95: ms(row.p95!.mean, 1),
            delta: strategy === 'none' ? 'baseline' : pct(delta),
            load: strategy === 'none' ? 'baseline' : `+${pct(row.extraLoad!.mean)}`,
            highlight: strategy === 'cost_aware_mlp',
          };
        }),
      )}
    />

    <p>
      Take the provisioned case first, where there is spare origin capacity. With a 1024-entry cache
      and 64 workers, every strategy helps. The cost-aware policy takes p95 from{' '}
      {ms(edgeRow('edge_warm', 64, 'none').p95!.mean, 1)} ms to{' '}
      {ms(edgeRow('edge_warm', 64, 'cost_aware_mlp').p95!.mean, 1)} ms, a reduction of{' '}
      {pct(Math.abs(edgeDelta('edge_warm', 64, 'cost_aware_mlp')))}, for{' '}
      {pct(edgeRow('edge_warm', 64, 'cost_aware_mlp').extraLoad!.mean)} additional origin load. Always-top-2
      reaches {pct(Math.abs(edgeDelta('edge_warm', 64, 'always_top2')))} for{' '}
      {pct(edgeRow('edge_warm', 64, 'always_top2').extraLoad!.mean)}. Those are within a few tenths of a
      percent of each other. When the origin has headroom and the cache has room, pricing the bet buys
      nothing, because no bet is expensive.
    </p>

    <Note label="The case that matters">
      <p>
        Now the saturated case: a 256-entry cache in front of 16 workers, which is what a system looks like
        during an incident. The baseline p95 is{' '}
        {ms(edgeRow('edge_small', 16, 'none').p95!.mean, 1)} ms.
      </p>
      <p>
        Always-top-2 takes it to {ms(edgeRow('edge_small', 16, 'always_top2').p95!.mean, 1)} ms, an increase
        of {pct(edgeDelta('edge_small', 16, 'always_top2'))}. Always-top-1 reaches{' '}
        {pct(edgeDelta('edge_small', 16, 'always_top1'))}. The cost-aware policy lands at{' '}
        {ms(edgeRow('edge_small', 16, 'cost_aware_mlp').p95!.mean, 1)} ms, a change of{' '}
        {pct(edgeDelta('edge_small', 16, 'cost_aware_mlp'))}, having issued enough prefetches to add{' '}
        {pct(edgeRow('edge_small', 16, 'cost_aware_mlp').extraLoad!.mean)} origin load and then stopped.
      </p>
    </Note>

    <p>
      The policy captures essentially all of the upside available in the benign regime and removes the
      failure mode in the hostile one. The mechanism behind that is simple and does not depend on the
      model being accurate. Backend cost in the gate scales with{' '}
      <M>{String.raw`1 + q/c`}</M>. At 16 workers with a saturated queue, that multiplier is large enough
      that no candidate probability the predictor can produce will clear the threshold, so the policy
      issues almost nothing. At 64 workers the multiplier is near 1 and the same candidates clear easily.
    </p>

    <Figure
      n={4}
      caption={
        <>
          p95 under the edge profile relative to no prefetching at the same operating point. Values above 1.0
          are strategies that made latency worse. The saturated cell on the left is where unconditional
          prefetching fails; the cost-aware policy is flat there and competitive everywhere else.
        </>
      }
    >
      <GroupedBarChart
        title="p95 relative to no prefetch, edge profile"
        sub="1.0 means identical to not prefetching · lower is better"
        unit="×"
        groups={EDGE_CELLS.map(cell => cell.label)}
        series={[
          { key: 'always_top2', label: 'Always top-2' },
          { key: 'static_rule', label: 'Static rule' },
          { key: 'cost_aware_mlp', label: 'Cost-aware (JAX)' },
        ].map(series => {
          const values = EDGE_CELLS.map(
            cell => 1 + edgeDelta(cell.regime, cell.concurrency, series.key),
          );
          return {
            label: series.label,
            values,
            displays: values.map(value => `${value.toFixed(2)}×`),
          };
        })}
      />
    </Figure>

    <H2 id="matched">What the origin distance is worth</H2>
    <p>
      The edge profile fixes the origin at {results.edge!.config.origin_base_milliseconds} ms. Sweeping that
      parameter shows how the benefit scales. Table 6 holds the policy fixed and varies only how far away
      the origin is, restricted to cells where the origin has enough capacity to serve the offered load.
    </p>

    <Table
      n={6}
      caption={
        <>
          Origin distance sweep, {num(results.latency!.totalRuns)} runs over{' '}
          {results.latency!.rows.length} configurations. Only cells whose origin capacity exceeds offered
          load are averaged, since a saturated origin is a different experiment. This sweep is exploratory:{' '}
          <M>{String.raw`\alpha`}</M> was chosen per cell on the same seeds, so treat the magnitudes as
          indicative and the trend as the finding.
        </>
      }
      columns={[
        { key: 'origin', label: 'Origin latency', numeric: true },
        { key: 'n', label: 'Cells', numeric: true },
        { key: 'base', label: 'Baseline p95', numeric: true },
        { key: 'rel', label: 'Cost-aware Δp95', numeric: true },
        { key: 'abs', label: 'Absolute saving', numeric: true },
      ]}
      rows={byOriginLatency.map(row => ({
        origin: `${row.originMs} ms`,
        n: row.cells,
        base: `${ms(row.baselineP95, 1)} ms`,
        rel: pct(row.relative),
        abs: `${ms(Math.abs(row.absolute), 1)} ms`,
        highlight: row.originMs === 400,
      }))}
    />

    <p>
      The relative saving is roughly constant at three to six percent. The absolute saving scales with
      origin distance, from about {ms(Math.abs(byOriginLatency[0].absolute), 1)} ms at{' '}
      {byOriginLatency[0].originMs} ms to about{' '}
      {ms(Math.abs(byOriginLatency[byOriginLatency.length - 1].absolute), 1)} ms at{' '}
      {byOriginLatency[byOriginLatency.length - 1].originMs} ms. Prefetching is therefore a technique for
      distant origins. The mechanism is identical at every distance, and only at distance is the saving
      large enough to justify the machinery.
    </p>

    <H2 id="sweep">Mapping the boundary</H2>
    <p>
      Two parameters decide whether speculation is safe. The origin distance sets how much a correct
      prefetch is worth. The cache capacity sets how likely a correct prefetch is to survive until it is
      used. The second one produced the most surprising number in the project.
    </p>

    <Table
      n={7}
      caption={
        <>
          Cache capacity sweep under the datacenter profile, averaged over every load level, TTL and origin
          size at each capacity. The last two columns are change in p95 against no prefetching at the same
          operating point, so negative is better.
        </>
      }
      columns={[
        { key: 'cap', label: 'Entries', numeric: true },
        { key: 'hit', label: 'Base hit', numeric: true },
        { key: 'p95', label: 'Base p95', numeric: true },
        { key: 'prec', label: 'Precision', numeric: true },
        { key: 'ca', label: 'Cost-aware', numeric: true },
        { key: 'nv', label: 'Naive', numeric: true },
      ]}
      rows={byCapacity.map(row => ({
        cap: num(row.capacity),
        hit: pct(row.baselineHit),
        p95: ms(row.baselineP95, 1),
        prec: pct(row.precision),
        ca: pct(row.costAwareDelta),
        nv: pct(row.naiveDelta),
      }))}
    />

    <p>
      Prefetch precision is not purely a property of the predictor. The same model, making the same
      predictions, goes from {pct(byCapacity[0].precision, 0)} to{' '}
      {pct(byCapacity[byCapacity.length - 1].precision, 0)} precision as the cache grows. A prefetch counts
      as correct only if the entry survives until the user asks for it. In a small cache it is evicted
      first, and a correct prediction is recorded as waste. A sizeable part of what looked like a model
      problem was a capacity problem.
    </p>
    <p>
      The same table contains the caution. At {num(byCapacity[0].capacity)} entries the no-prefetch p95 is{' '}
      {ms(byCapacity[0].baselineP95, 0)} ms; at {num(byCapacity[2].capacity)} entries it is{' '}
      {ms(byCapacity[2].baselineP95, 0)} ms. Growing the cache is worth roughly{' '}
      {ms(byCapacity[0].baselineP95 - byCapacity[2].baselineP95, 0)} ms on this workload. Before building a
      prefetcher, it is worth measuring what a larger cache would do, because on a same-datacenter origin
      that single change dominates anything speculation can offer.
    </p>

    <Note label="Two failure modes, one gate">
      <p>
        Across the {sweepRows.length} datacenter configurations, always-top-1 is significantly worse than no
        prefetching at {naiveRegret.losses} of them, with a worst case of{' '}
        {pct(naiveRegret.worst, 0)}. The cost-aware policy is significantly worse at{' '}
        {costAwareRegret.losses}, worst case {pct(costAwareRegret.worst, 0)}. Their median outcomes differ by{' '}
        {(Math.abs(naiveRegret.median - costAwareRegret.median) * 100).toFixed(1)} percentage points.
      </p>
      <p>
        The gate does not improve prefetching in the regimes where prefetching already works. What it
        provides is safety across regimes, so the policy can be deployed without knowing in advance
        which regime the system is in, and without being retuned when that changes.
      </p>
    </Note>

    <H2 id="takeaway">Limitations and what I would change</H2>
    <p>
      The headline result holds under a specific set of assumptions, and the assumptions are doing real work.
      Four of them are worth stating plainly.
    </p>

    <H3>The origin model is the weakest link</H3>
    <p>
      Service time is a function of response size plus lognormal jitter, and the origin is a single queue with
      fixed concurrency. Real origins have caches of their own, correlated failures, and per-endpoint cost
      structures that are nothing like linear in bytes. The workload is real; the thing serving it is not, and
      every latency number inherits that. Replaying the trace against an actual HTTP server is the obvious
      next step and would make the millisecond figures quotable rather than indicative.
    </p>

    <H3>Inference cost is larger than it looks</H3>
    <p>
      A single-example forward pass through the {num(results.modelCost.parameter_count)}-parameter model takes
      a median of {results.modelCost.single_example_inference_microseconds_median.toFixed(1)} µs on CPU, with
      a p95 of {results.modelCost.single_example_inference_microseconds_p95.toFixed(1)} µs. Most of that is
      dispatch overhead rather than arithmetic. On a request path where the decision is synchronous, spending
      {' '}{results.modelCost.single_example_inference_microseconds_median.toFixed(0)} µs to decide not to
      prefetch compares poorly against a lookup table. Batching the decisions, or exporting the model and
      leaving Python out of the request path, would remove most of it. I did not do either.
    </p>

    <H3>The prediction target is harder than it needs to be</H3>
    <p>
      Top-1 accuracy of {pct(results.predictorNasa.jax_mlp.top1_accuracy)} over 512 paths sets the ceiling on
      the economics. Predicting a set of likely next resources, or predicting at the level of resource groups
      rather than exact paths, would raise effective precision substantially, and precision is the term the
      cost model is most sensitive to. Table 7 already shows half of this effect arriving for free when the
      cache is large enough to hold the predictions.
    </p>

    <H3>Alpha selection is honest in one sweep and exploratory in another</H3>
    <p>
      In the two profile experiments, <M>{String.raw`\alpha`}</M> is chosen on five validation seeds and
      reported on seven disjoint test seeds. In the origin-distance sweep it is chosen per cell on the same
      seeds it is reported on. The trend in Table 6 is robust to this; the exact magnitudes are optimistic.
      Both are labelled as such in the results JSON.
    </p>

    <H3>What holds up</H3>
    <p>
      Writing down <M>{String.raw`\mathbb{E}[\text{gain}] > \alpha\,\mathbb{E}[\text{cost}]`}</M> and then
      measuring every term in it forced questions that "does the predictor work?" never would: what a wasted
      prefetch costs, how that cost scales with queue depth, how much a correct prediction is worth as a
      function of origin distance, and how much of prefetch precision is really cache capacity in disguise.
      Those questions produced the two numbers this post exists for. Under the edge profile the policy
      captures {pct(Math.abs(edgeDelta('edge_warm', 64, 'cost_aware_mlp')))} of p95 where the origin has
      headroom, and changes p95 by {pct(edgeDelta('edge_small', 16, 'cost_aware_mlp'))} where it does not,
      against {pct(edgeDelta('edge_small', 16, 'always_top2'))} for the unconditional version of the same
      predictions.
    </p>
    <p>
      Any speculative fetch is a bet on future demand, whether or not the system that issues it
      represents the odds explicitly. Writing them down is what makes the bet controllable.
    </p>

    <References refs={JAX_REFS} bibtex={JAX_BIBTEX} />
  </Article>
);

export default BlogPrefetch;
