import React from 'react';
import Article, { H2, H3, Note } from './post/Article';
import Figure from './post/Figure';
import Table from './post/Table';
import Code from './post/Code';
import { M } from './post/Math';
import References, { makeCite } from './post/References';
import { LineChart, ScatterChart } from './post/Charts';
import { SECRET_REFS, SECRET_BIBTEX } from './post/refsSecret';
import { POST_BY_SLUG } from './post/posts';
import results from './post/results/secret.json';

const Cite = makeCite(SECRET_REFS);
const meta = POST_BY_SLUG.secret;

const TOC = [
  { id: 'question', label: 'The question' },
  { id: 'measurable', label: 'What makes it measurable' },
  { id: 'whose-beliefs', label: 'Consistency against whose beliefs' },
  { id: 'behaviour', label: 'The behavioural result' },
  { id: 'control', label: 'The control' },
  { id: 'wrong', label: 'Two hypotheses that did not hold' },
  { id: 'probe', label: 'Is anything represented at all' },
  { id: 'causal', label: 'Steering the representation' },
  { id: 'limits', label: 'Limitations' },
];

const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const num = (value: number) => value.toLocaleString('en-US');

const E = results.elicitation;
const P = results.probe;
const C = results.control;
const CFULL = results.controlFull;
const ARMS = results.arms;
const ANALYSIS = results.analysis;

const bestLayer = Object.entries(P.layers).reduce(
  (best, entry) => (entry[1].accuracy > best[1].accuracy ? entry : best),
);
const probeLayer = bestLayer[0];
const probeStats = bestLayer[1];

const randomArm = ANALYSIS.arms.random;
const greedyArm = ANALYSIS.arms.greedy;

const STEER = results.steering;
const STEER_LAYER = 24;
const SL = STEER.layers['24'];
const SU = SL.unsteered;
const SP = SL.probe_alpha1;
const SR = SL.random_alpha1;
const STEER_ALPHAS = [1, 2, 4, 8];
const PROBE_SWEEP = [SL.probe_alpha1, SL.probe_alpha2, SL.probe_alpha4, SL.probe_alpha8];
const RANDOM_SWEEP = [SL.random_alpha1, SL.random_alpha2, SL.random_alpha4, SL.random_alpha8];

const ARM_LABEL: Record<string, string> = {
  greedy: 'Optimal questioner, greedy',
  sampled: 'Optimal questioner, T = 0.7',
  sampled_t1: 'Optimal questioner, T = 1.0',
  random: 'Random questioner, greedy',
  subset10: '10-animal subsets, greedy',
};

const ARM_ORDER = ['greedy', 'sampled', 'sampled_t1', 'random', 'subset10'];

const ELICIT_CODE = `for object_index in range(reference.object_count):
    name = reference.display(object_index)
    for attribute_index, attribute in enumerate(reference.attributes):
        statement = statement_for(attribute, name)
        prompts.append(model.chat_prefix(fact_messages(statement)))

probabilities = rn.yes_probability(model, prompts, batch_size=args.batch_size)
binary = (probability_matrix >= 0.5).astype(np.int8)`;

const CONSISTENCY_CODE = `def apply_answer(state: GameState, attribute_index: int, answer: bool) -> GameState:
    column = state.world.matrix[:, attribute_index].astype(bool)
    match = column if answer else ~column
    return GameState(
        world=state.world,
        consistent=state.consistent & match,
        asked=state.asked + [attribute_index],
        answers=state.answers + [answer],
    )`;

const BlogSecret: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <Article
    onBack={onBack}
    title={meta.title}
    date={meta.date}
    repo={meta.repo}
    toc={TOC}
  >
    <H2 id="question">The question</H2>
    <p>
      Ask a model to think of an animal and not tell you which. It says "Ready." Then you start
      asking yes or no questions.
    </p>
    <p>
      Nothing about the animal is in the transcript. The system prompt lists the candidates, the
      model said one word, and every later answer is conditioned on text that never names the
      choice. So either the choice exists somewhere in the model's state, or the model improvises
      each answer and only appears to have committed.
    </p>
    <p>
      The same assumption appears well outside party games. Multi-turn agents rely on latent state
      surviving across turns without being written down: a plan held while tools run, a hypothesis
      held while evidence accumulates, a constraint held while a conversation wanders. That
      assumption is rarely tested, because testing it usually requires knowing what the model was
      supposed to be holding. 20 Questions makes it testable, since the ground truth is
      computable.
    </p>

    <H2 id="measurable">What makes it measurable</H2>
    <p>
      Fifty animals and eighty-five binary attributes, from the Animals with Attributes 2
      matrix<Cite ids={[4]} />. Human annotated rather than model generated, which matters for
      reasons in the next section. All fifty rows are distinct, so every animal is uniquely
      identifiable.
    </p>
    <p>That one matrix provides four things at once:</p>
    <ul>
      <li>
        <strong>Exact contradiction detection.</strong> Track the set of animals consistent with
        every answer so far. When that set empties, the model has contradicted itself. The check is
        exact, so no judgement is involved.
      </li>
      <li><strong>The exact posterior</strong> over animals at every turn.</li>
      <li>
        <strong>An optimal questioner</strong> by information gain, so the interrogator is a
        controlled instrument rather than a second noisy model.
      </li>
      <li><strong>Labels for probing.</strong></li>
    </ul>

    <Code language="python" file="src/game/engine.py">{CONSISTENCY_CODE}</Code>

    <p>
      Perfect play identifies the animal in a mean of 5.72 questions against an information floor of{' '}
      <M>{String.raw`\log_2 50 = 5.64`}</M>. A twenty-question game leaves about fourteen turns of
      slack.
    </p>

    <H2 id="whose-beliefs">Consistency against whose beliefs</H2>
    <p>
      The choice of which beliefs to score against determines whether any of this measures the
      right thing. If the model thinks a lion counts as black and the human annotators disagree,
      scoring against the human matrix records a contradiction where none exists. That would
      measure disagreement about animals rather than failure to hold a commitment.
    </p>
    <p>
      So the pipeline first asks the model all {num(E.objects * E.attributes)} attribute questions
      and builds <em>its</em> matrix. Games are scored against that.
    </p>

    <Code language="python" file="scripts/elicit.py">{ELICIT_CODE}</Code>

    <p>
      The model agrees with the human annotation {pct(E.agreement_with_human_annotation)} of the
      time. That {pct(1 - E.agreement_with_human_annotation)} disagreement is exactly what would
      otherwise have been misread as inconsistency. Under the model's own beliefs all fifty rows
      remain distinct, so the game is still well posed.
    </p>

    <Note label="One more design decision">
      <p>
        With an identical prompt and greedy decoding, every game picks the same animal, so two
        hundred games would be one game repeated two hundred times. Each game therefore sees a
        different random subset of the catalogue. The model still chooses freely, and the choices
        spread across the catalogue.
      </p>
    </Note>

    <H2 id="behaviour">The behavioural result</H2>

    <Table
      n={1}
      caption={
        <>
          Every arm. Contradiction means the set of animals consistent with the model's own answers
          became empty. Self-agreement compares each in-game answer against the model's own stated
          belief about the animal it eventually revealed.
        </>
      }
      columns={[
        { key: 'arm', label: 'Arm' },
        { key: 'games', label: 'Games', numeric: true },
        { key: 'contradicted', label: 'Contradicted', numeric: true },
        { key: 'death', label: 'Median turn', numeric: true },
        { key: 'agreement', label: 'Self-agreement', numeric: true },
      ]}
      rows={ARM_ORDER.filter(tag => ARMS[tag]).map(tag => ({
        arm: ARM_LABEL[tag],
        games: ARMS[tag].games,
        contradicted: pct(ARMS[tag].contradicted),
        death: ARMS[tag].medianDeathTurn,
        agreement: ANALYSIS.arms[tag] ? pct(ANALYSIS.arms[tag].overall_agreement) : '—',
        highlight: tag === 'greedy',
      }))}
    />

    <p>
      Perfect play needs six questions. Given twenty, the model contradicts itself in{' '}
      {pct(ARMS.greedy.contradicted)} of games, with the first contradiction arriving around turn{' '}
      {ARMS.greedy.medianDeathTurn}.
    </p>

    <Figure
      n={1}
      caption={
        <>
          Fraction of games still logically possible after each turn, under the optimal questioner
          and under a random one. The optimal questioner eliminates candidates faster by
          construction, since it asks the questions that split the candidate set most evenly. Both
          arms end with almost no games still consistent.
        </>
      }
    >
      <LineChart
        title="Games still logically possible"
        sub="A game dies when no animal is consistent with every answer given so far"
        xLabel="turn"
        yLabel="%"
        unit="% alive"
        xTicks={[1, 4, 8, 12, 16, 20].map(v => ({ v, label: String(v) }))}
        series={[
          {
            label: 'Optimal questioner',
            points: ARMS.greedy.survival.map(s => ({ x: s.turn, y: Number((s.alive * 100).toFixed(1)) })),
            endLabel: `${(ARMS.greedy.survival[ARMS.greedy.survival.length - 1].alive * 100).toFixed(1)}%`,
          },
          {
            label: 'Random questioner',
            points: ARMS.random.survival.map(s => ({ x: s.turn, y: Number((s.alive * 100).toFixed(1)) })),
            endLabel: `${(ARMS.random.survival[ARMS.random.survival.length - 1].alive * 100).toFixed(1)}%`,
          },
        ]}
      />
    </Figure>

    <H2 id="control">The control</H2>
    <p>A high contradiction rate admits two very different explanations:</p>
    <ol>
      <li>the model never held a commitment, and every answer is improvised</li>
      <li>
        it held one, but its beliefs about the animal shift with prompt context, so comparing
        against elicited beliefs is unfair
      </li>
    </ol>
    <p>
      To separate them, re-ask every question from every game with the animal named explicitly:{' '}
      <em>You are thinking of a zebra. Is it fast?</em> Same model, same questions, same beliefs
      under test. The only thing that changes is whether the referent sits in the text or in the
      model's head.
    </p>

    <Table
      n={2}
      caption={
        <>
          Agreement with the model's own elicited beliefs, over {num(CFULL.comparisons)} paired
          comparisons in the main arm. Because both conditions use the identical question set, the
          attribute mix is held fixed and the only difference is where the animal lives.
        </>
      }
      columns={[
        { key: 'condition', label: 'Condition' },
        { key: 'full', label: '50 animals', numeric: true },
        { key: 'subset', label: '10-animal subsets', numeric: true },
      ]}
      rows={[
        {
          condition: 'Animal named in the prompt',
          full: pct(CFULL.named_context_vs_elicited_beliefs),
          subset: pct(C.named_context_vs_elicited_beliefs),
        },
        {
          condition: 'Animal held only in its head',
          full: pct(CFULL.in_game_vs_elicited_beliefs),
          subset: pct(C.in_game_vs_elicited_beliefs),
        },
        {
          condition: 'Cost of latency',
          full: `${((CFULL.named_context_vs_elicited_beliefs - CFULL.in_game_vs_elicited_beliefs) * 100).toFixed(1)} pts`,
          subset: `${((C.named_context_vs_elicited_beliefs - C.in_game_vs_elicited_beliefs) * 100).toFixed(1)} pts`,
          highlight: true,
        },
      ]}
    />

    <p>
      The gap replicates across two independent designs. The model's beliefs about zebras are stable
      enough when the word zebra is present, so most of the in-game inconsistency is a failure to
      hold the referent rather than a shifting opinion about zebras. The residual, roughly{' '}
      {pct(1 - CFULL.named_context_vs_elicited_beliefs, 0)} even when the animal is named, is
      ordinary prompt-context noise, and the control puts a number on it.
    </p>

    <H2 id="wrong">Two hypotheses that did not hold</H2>

    <H3>Temperature does not matter</H3>
    <p>
      The original design treated sampling as the key control. If consistency collapsed at higher
      temperature, the model was re-deriving its answer from the prefix each turn rather than
      holding anything. Contradiction rates at T = 0.0, 0.7 and 1.0 are{' '}
      {pct(ARMS.greedy.contradicted)}, {pct(ARMS.sampled.contradicted)} and{' '}
      {pct(ARMS.sampled_t1.contradicted)}. There is no consistency left to collapse, so the control
      has no discriminating power.
    </p>
    <p>
      Underneath the saturated game outcome, answer-level agreement degrades with temperature:{' '}
      {pct(ANALYSIS.arms.greedy.overall_agreement)},{' '}
      {pct(ANALYSIS.arms.sampled.overall_agreement)} and{' '}
      {pct(ANALYSIS.arms.sampled_t1.overall_agreement)}. Sampling does make agreement worse, but
      the game-level outcome is already saturated, so the effect has nowhere to show up.
    </p>

    <H3>There is no drift over turns</H3>
    <p>
      A natural explanation is that the model loses the thread as context grows. The measurement
      that appears to support this is confounded, and once the confound is removed the effect
      disappears.
    </p>
    <p>
      Under the optimal questioner, agreement appears to climb steeply over the first few turns, a
      trend of {greedyArm.turn_trend_per_turn > 0 ? '+' : ''}
      {greedyArm.turn_trend_per_turn.toFixed(4)} per turn. That is an artifact. The
      information-maximising first question is the same in every game, so turn index and attribute
      are perfectly confounded. Turn one is always <em>is it fast</em>, which the model answers
      inconsistently most of the time.
    </p>
    <p>
      Switching to a random questioner decorrelates them, and the trend flattens to{' '}
      <strong>{randomArm.turn_trend_per_turn.toFixed(4)} per turn</strong>.
    </p>

    <Figure
      n={2}
      caption={
        <>
          Self-agreement by turn under the random questioner, which breaks the confound between turn
          index and attribute. The line is flat: the model is inconsistent at roughly the same rate
          from the first question onward. That pattern is inconsistent with context degradation,
          which would show agreement falling as the transcript grows.
        </>
      }
    >
      <LineChart
        title="Self-agreement by turn, random questioner"
        sub="Fraction of answers matching the model's own belief about the animal it later revealed"
        xLabel="turn"
        yLabel="%"
        unit="% agreement"
        xTicks={[1, 4, 8, 12, 16, 20].map(v => ({ v, label: String(v) }))}
        series={[
          {
            label: 'Random questioner',
            points: randomArm.agreement_by_turn
              .slice(0, 20)
              .map(r => ({ x: r.turn, y: Number((r.agreement * 100).toFixed(1)) })),
          },
        ]}
      />
    </Figure>

    <p>
      The per-attribute breakdown accounts for most of what is left.
    </p>

    <Figure
      n={3}
      caption={
        <>
          Self-agreement against how skewed each attribute is across the fifty animals, where skew
          is <M>{String.raw`|\,p - 0.5\,|`}</M> and <M>{String.raw`p`}</M> is the fraction of
          animals having it. An attribute with skew near 0.5 has the same answer for nearly every
          animal, so it can be answered correctly without knowing which animal was chosen.
        </>
      }
    >
      <ScatterChart
        title="Self-agreement against attribute skew"
        sub="Random questioner, one point per attribute asked at least 25 times"
        xLabel="skew"
        yLabel="agreement %"
        seriesLabels={['Discriminating (skew < 0.15)', 'Answerable without the secret']}
        points={randomArm.attribute_skew.map(row => ({
          x: Number(row.skew.toFixed(3)),
          y: Number((row.agreement * 100).toFixed(1)),
          label: `${row.attribute}, ${pct(row.base_rate, 0)} of animals`,
          series: row.skew < 0.15 ? 0 : 1,
        }))}
      />
    </Figure>

    <p>
      Across all {randomArm.attribute_skew.length} attributes, self-agreement correlates with skew
      at <M>{String.raw`r = ${randomArm.skew_correlation.toFixed(3)}`}</M>. Split at the extremes:
      the {randomArm.balanced_attribute_count} balanced attributes, the ones that actually
      discriminate between animals, get {pct(randomArm.balanced_attribute_agreement)} agreement. The{' '}
      {randomArm.skewed_attribute_count} skewed ones get{' '}
      {pct(randomArm.skewed_attribute_agreement)}.
    </p>

    <Note label="What that means">
      <p>
        The model answers perfectly on questions like <em>is it weak</em> (no animal in the set is),{' '}
        <em>can it fly</em> (2% can) and <em>is it slow</em> (4% are). None of these require knowing
        the secret, because answering "No" is consistent with almost every animal in the set.
      </p>
      <p>
        It fails on the questions that can only be answered by knowing which animal was chosen. Its
        apparent consistency is therefore largely an artifact of question difficulty: the more a
        question would tell you about the animal, the less reliably the model answers it.
      </p>
      <p>
        This also explains why the optimal questioner ends games faster than the random one.
        Maximising information gain means picking the most balanced question available, which is
        where the model is weakest, so better questions produce contradictions sooner.
      </p>
    </Note>

    <H2 id="probe">Is anything represented at all</H2>
    <p>
      Behaviour says the model does not hold a secret. Whether it ever <em>forms</em> one is a
      separate question, and answering it needs a look at the activations.
    </p>
    <p>
      Train a linear probe on the residual stream at the commitment turn, right after the model says
      "Ready" and before any question is asked, to predict which animal it names when asked
      immediately. Probing for answers the model has computed but not yet emitted is established
      technique<Cite ids={[1, 2]} />, and the same logic underlies work reading board state out of
      game-playing models<Cite ids={[3]} />. Then apply that probe to the commitment turn of full
      games and ask whether it predicts the animal revealed twenty questions later.
    </p>

    <Note label="The baseline that nearly fooled me">
      <p>
        My first run reported {pct(0.616)} probe accuracy against {pct(0.02)} uniform chance, which
        looked strong until I computed the majority-class baseline: {pct(0.504)}. Asked to pick
        with no questions in between, the model collapsed onto one animal half the time, so the
        probe was barely better than a constant predictor and its transfer score was <em>worse</em>{' '}
        than always guessing zebra.
      </p>
      <p>
        Giving each game a random ten-animal subset fixed the label collapse, taking distinct
        choices from 24 to {P.distinct_animals_chosen} of 50. Every number below is reported against
        the majority baseline rather than uniform chance.
      </p>
    </Note>

    <Table
      n={3}
      caption={
        <>
          Linear probe on commitment-turn activations, {num(P.parsed)} samples, layer {probeLayer} of
          the residual stream. Probe accuracy predicts the animal named immediately. Transfer
          accuracy applies the same probe to real games and predicts the animal revealed at the end.
        </>
      }
      columns={[
        { key: 'what', label: 'Measurement' },
        { key: 'top1', label: 'Top-1', numeric: true },
        { key: 'vs', label: 'vs majority', numeric: true },
        { key: 'top5', label: 'Top-5', numeric: true },
      ]}
      rows={[
        {
          what: 'Majority-class baseline',
          top1: pct(P.most_common_baseline),
          vs: '1.0x',
          top5: '—',
        },
        {
          what: 'Probe, animal named immediately',
          top1: pct(probeStats.accuracy),
          vs: `${(probeStats.accuracy / P.most_common_baseline).toFixed(1)}x`,
          top5: pct(probeStats.top5_accuracy),
          highlight: true,
        },
        {
          what: 'Transfer, animal revealed after the game',
          top1: pct(probeStats.transfer_accuracy),
          vs: `${(probeStats.transfer_accuracy / P.transfer_most_common_baseline).toFixed(1)}x`,
          top5: pct(probeStats.transfer_top5_accuracy),
        },
      ]}
    />

    <p>
      At the moment of commitment there <em>is</em> a representation. A linear probe reads the
      animal out of the activations at{' '}
      {pct(probeStats.accuracy)}, which is {(probeStats.accuracy / P.most_common_baseline).toFixed(1)}{' '}
      times the majority baseline, with the correct animal in the probe's top five{' '}
      {pct(probeStats.top5_accuracy)} of the time. The model does pick something, and the choice is
      readable from its activations before it has said anything about it.
    </p>
    <p>
      That representation does not survive the game. The same probe predicts the eventually revealed
      animal at {pct(probeStats.transfer_accuracy)}, only{' '}
      {(probeStats.transfer_accuracy / P.transfer_most_common_baseline).toFixed(1)} times baseline,
      with top five falling from {pct(probeStats.top5_accuracy)} to{' '}
      {pct(probeStats.transfer_top5_accuracy)}.
    </p>
    <p>
      The failure is therefore not an absence of choice. The model chooses, the choice is linearly
      decodable at the moment it is made, and over twenty turns of answering questions about it the
      choice largely disappears. What the model reveals at the end is only weakly related to what it
      was holding at the start.
    </p>

    <H2 id="causal">Steering the representation</H2>
    <p>
      A probe that reads a variable does not show that the model uses it. The direction could be a
      trace that nothing downstream consults. Writing to it rather than reading from it
      distinguishes the two cases.
    </p>
    <p>
      In each game the animal the model names when asked immediately is the <em>source</em>. A
      different animal from the same catalogue is the <em>target</em>. Adding the probe's
      source-to-target direction into the residual stream should push the model toward the target
      if that direction is load-bearing. Two things then get measured: whether the model names the
      target, and whether its Yes/No answers move onto the target's attribute profile. Questions
      are restricted to attributes where source and target disagree, so agreeing with one is
      disagreeing with the other. A random direction of the same norm serves as the control, since
      a large enough perturbation changes behaviour regardless of what it encodes.
    </p>

    <Table
      n={4}
      caption={
        <>
          Steering at layer {STEER_LAYER}, {num(STEER.eval_pairs)} games and{' '}
          {num(STEER.questions_per_condition)} attribute questions per condition. The random
          direction is drawn to the same norm as the probe direction.
        </>
      }
      columns={[
        { key: 'condition', label: 'condition' },
        { key: 'target', label: 'reveals target', numeric: true },
        { key: 'source', label: 'reveals source', numeric: true },
        { key: 'coherent', label: 'coherent', numeric: true },
        { key: 'answers', label: 'answers → target', numeric: true },
      ]}
      rows={[
        {
          condition: 'unsteered',
          target: pct(SU.reveal_is_target),
          source: pct(SU.reveal_is_source),
          coherent: pct(SU.reveal_is_animal),
          answers: pct(SU.answer_matches_target),
        },
        {
          condition: 'probe direction',
          target: pct(SP.reveal_is_target),
          source: pct(SP.reveal_is_source),
          coherent: pct(SP.reveal_is_animal),
          answers: pct(SP.answer_matches_target),
          highlight: true,
        },
        {
          condition: 'random direction',
          target: pct(SR.reveal_is_target),
          source: pct(SR.reveal_is_source),
          coherent: pct(SR.reveal_is_animal),
          answers: pct(SR.answer_matches_target),
        },
      ]}
    />

    <p>
      Steering along the probe direction makes the model name the target in{' '}
      {pct(SP.reveal_is_target)} of games, up from {pct(SU.reveal_is_target)}, while still
      producing a valid animal name {pct(SP.reveal_is_animal)} of the time. The random direction at
      the same norm reaches {pct(SR.reveal_is_target)}. It also clears out the original choice,
      which falls from {pct(SU.reveal_is_source)} to {pct(SP.reveal_is_source)} under the probe
      direction and only to {pct(SR.reveal_is_source)} under the random one.
    </p>
    <p>
      The answers are unaffected. Agreement with the target's attribute profile goes from{' '}
      {pct(SU.answer_matches_target)} to {pct(SP.answer_matches_target)}, and the random control
      sits at {pct(SR.answer_matches_target)}. On the questions chosen to separate the two animals,
      steering changes nothing.
    </p>
    <p>
      The unsteered row is worth reading alongside this. Before any intervention the model's
      answers match its own revealed animal {pct(SU.answer_matches_source)} of the time on these
      attributes, which is chance. So the probe direction determines what the model reports it was
      thinking of, while the answers it gives are unrelated to that report either way. The
      commitment behaves like a label on the report rather than a state that drives behaviour.
    </p>

    <Figure
      n={4}
      caption={
        <>
          The effect holds over a narrow range of strengths. At{' '}
          <M>{'\\alpha = 1'}</M> the model is still coherent{' '}
          {pct(SP.reveal_is_animal)} of the time; by <M>{'\\alpha = 2'}</M> that has fallen to{' '}
          {pct(SL.probe_alpha2.reveal_is_animal)} and the apparent drop in target naming is mostly
          the model no longer producing animal names at all.
        </>
      }
    >
      <LineChart
        title="Naming the target under steering, layer 24"
        sub="Fraction of games where the model names the target animal instead of its own choice"
        xLabel="steering strength α"
        yLabel="%"
        unit="% name target"
        xTicks={STEER_ALPHAS.map(v => ({ v, label: String(v) }))}
        series={[
          {
            label: 'Probe direction',
            points: PROBE_SWEEP.map((row, i) => ({
              x: STEER_ALPHAS[i],
              y: Number((row.reveal_is_target * 100).toFixed(1)),
            })),
            endLabel: pct(PROBE_SWEEP[PROBE_SWEEP.length - 1].reveal_is_target),
          },
          {
            label: 'Random direction',
            points: RANDOM_SWEEP.map((row, i) => ({
              x: STEER_ALPHAS[i],
              y: Number((row.reveal_is_target * 100).toFixed(1)),
            })),
            endLabel: pct(RANDOM_SWEEP[RANDOM_SWEEP.length - 1].reveal_is_target),
          },
        ]}
      />
    </Figure>

    <Note label="Which layer">
      Layer {STEER_LAYER} is the one to read. At layer 16 the model stops producing animal names at
      all once steering is strong enough to do anything, with coherence at{' '}
      {pct(STEER.layers['16'].probe_alpha1.reveal_is_animal)} even at the weakest setting. Layer 32
      gives a larger effect, {pct(STEER.layers['32'].probe_alpha1.reveal_is_target)}, but it is the
      final residual stream and only the next token's logits sit downstream of it, so steering
      there is close to editing the output distribution directly. Layer 24 is the one with real
      computation left to propagate through.
    </Note>

    <H2 id="limits">Limitations</H2>
    <p>
      One model and one family. Whether a larger model holds a commitment is the obvious next
      question and this says nothing about it.
    </p>
    <p>
      Fifty animals with eighty-five attributes is a small and very concrete world. An open-ended
      secret, the kind an agent would actually hold, may behave differently in either direction.
    </p>
    <p>
      The elicited belief matrix is itself a model output, taken at one temperature in one prompt
      format. The named-animal control bounds how much that matters, since agreement reaches{' '}
      {pct(CFULL.named_context_vs_elicited_beliefs)} when the referent is explicit, but it does not
      eliminate it.
    </p>
    <p>
      The probe is linear and trained on the last token of the commitment turn. A representation
      that is distributed differently, or nonlinear, would be missed, so{' '}
      {pct(probeStats.accuracy)} is a lower bound on what is encoded rather than a measurement of
      it.
    </p>
    <p>
      The steering result inherits that bound. A linear write along a linear probe's direction is a
      coarse intervention, so the answers failing to move is evidence that this particular direction
      does not drive them rather than evidence that nothing does. A nonlinear or multi-direction
      edit could behave differently.
    </p>
    <p>
      Steering also works over a narrow range of strengths, and outside that range the model stops
      producing animal names at all. Reporting coherence alongside the effect keeps that failure
      visible in the numbers.
    </p>

    <References refs={SECRET_REFS} bibtex={SECRET_BIBTEX} />
  </Article>
);

export default BlogSecret;
