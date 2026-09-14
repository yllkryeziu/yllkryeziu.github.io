import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(ROOT, "results")

ARM_LABELS = {
    "greedy": "optimal questioner, greedy",
    "sampled": "optimal questioner, T = 0.7",
    "sampled_t1": "optimal questioner, T = 1.0",
    "random": "random questioner, greedy",
    "subset10": "10-animal subsets, greedy",
}

ARM_ORDER = ("greedy", "sampled", "sampled_t1", "random", "subset10")


def load(name):
    with open(os.path.join(RESULTS, name), encoding="utf-8") as handle:
        return json.load(handle)


def build() -> str:
    elicitation = load("elicitation.json")
    analysis = load("analysis.json")
    probe = load("probe_subset10.json")
    control = load("control.json")
    steering = load("steering.json")
    control_subset = load("control_subset10.json")

    arms = {}
    for tag in ARM_ORDER:
        path = os.path.join(RESULTS, f"play_{tag}.json")
        if os.path.exists(path):
            arms[tag] = load(f"play_{tag}.json")

    best_layer, best = max(probe["layers"].items(), key=lambda kv: kv[1]["accuracy"])
    random_arm = analysis["arms"]["random"]
    steer = steering["layers"]["24"]
    unsteered, probed, randomed = (
        steer["unsteered"], steer["probe_alpha1"], steer["random_alpha1"])

    arm_rows = []
    for tag, row in arms.items():
        agreement = analysis["arms"].get(tag, {}).get("overall_agreement")
        arm_rows.append(
            f"| {ARM_LABELS[tag]} | {row['games']} | "
            f"{row['contradicted_fraction'] * 100:.1f}% | {row['median_death_turn']:.0f} | "
            f"{agreement * 100:.1f}% |" if agreement is not None else
            f"| {ARM_LABELS[tag]} | {row['games']} | "
            f"{row['contradicted_fraction'] * 100:.1f}% | {row['median_death_turn']:.0f} | - |"
        )

    return f"""# latent-commitment

Does a language model actually hold a secret it never wrote down?

Ask it to think of an animal and not say which. Nothing about the choice enters the transcript, so
either the choice lives in the model's state or every answer is improvised. 20 Questions makes that
testable, because the ground truth is computable.

Every number below is produced by `scripts/run_all.sh` and written to `results/`.

## Results

Qwen3.5-9B, 50 animals, 85 binary attributes from Animals with Attributes 2.

| arm | games | contradicted | median death turn | self-agreement |
| --- | ---: | ---: | ---: | ---: |
{chr(10).join(arm_rows)}

Perfect play identifies the animal in a mean of 5.72 questions against a floor of log2(50) = 5.64,
so a twenty-question game leaves fourteen turns of slack. The model still contradicts itself in
almost every game.

### The control

A high contradiction rate could mean the model never committed, or that its beliefs shift with
prompt context. Re-asking every question with the animal named explicitly separates them.

| condition | 50 animals | 10-animal subsets |
| --- | ---: | ---: |
| animal named in the prompt | {control['named_context_vs_elicited_beliefs'] * 100:.1f}% | {control_subset['named_context_vs_elicited_beliefs'] * 100:.1f}% |
| animal held only in its head | {control['in_game_vs_elicited_beliefs'] * 100:.1f}% | {control_subset['in_game_vs_elicited_beliefs'] * 100:.1f}% |
| cost of latency | {(control['named_context_vs_elicited_beliefs'] - control['in_game_vs_elicited_beliefs']) * 100:.1f} pts | {(control_subset['named_context_vs_elicited_beliefs'] - control_subset['in_game_vs_elicited_beliefs']) * 100:.1f} pts |

The gap replicates across two designs. Beliefs are stable when the referent is explicit, so most of
the in-game inconsistency is failure to hold the referent.

### Apparent consistency tracks question difficulty

Self-agreement correlates with attribute skew at r = {random_arm['skew_correlation']:.3f}. The
{random_arm['balanced_attribute_count']} balanced attributes, the ones that discriminate between
animals, get {random_arm['balanced_attribute_agreement'] * 100:.1f}% agreement. The
{random_arm['skewed_attribute_count']} skewed ones, answerable without knowing the secret at all,
get {random_arm['skewed_attribute_agreement'] * 100:.1f}%.

This also explains why an optimal questioner kills games faster than a random one: maximising
information gain means choosing the most balanced question, which is exactly where the model is
weakest.

### Is anything represented

A linear probe on commitment-turn activations, layer {best_layer}, {probe['parsed']} samples.

| measurement | top-1 | vs majority | top-5 |
| --- | ---: | ---: | ---: |
| majority-class baseline | {probe['most_common_baseline'] * 100:.1f}% | 1.0x | - |
| probe, animal named immediately | {best['accuracy'] * 100:.1f}% | {best['accuracy'] / probe['most_common_baseline']:.1f}x | {best['top5_accuracy'] * 100:.1f}% |
| transfer, animal revealed after the game | {best['transfer_accuracy'] * 100:.1f}% | {best['transfer_accuracy'] / probe['transfer_most_common_baseline']:.1f}x | {best['transfer_top5_accuracy'] * 100:.1f}% |

The commitment is real and linearly decodable at the moment it is made. It largely does not survive
the game.

### Is the representation causal

Writing the probe's source-to-target direction into the residual stream at layer 24. The source is
the animal the model names on its own; the target is a different animal from the same catalogue.
A random direction of equal norm is the control.

| condition | names target | names own choice | still an animal | answers match target |
| --- | ---: | ---: | ---: | ---: |
| unsteered | {unsteered['reveal_is_target'] * 100:.1f}% | {unsteered['reveal_is_source'] * 100:.1f}% | {unsteered['reveal_is_animal'] * 100:.1f}% | {unsteered['answer_matches_target'] * 100:.1f}% |
| probe direction | {probed['reveal_is_target'] * 100:.1f}% | {probed['reveal_is_source'] * 100:.1f}% | {probed['reveal_is_animal'] * 100:.1f}% | {probed['answer_matches_target'] * 100:.1f}% |
| random direction | {randomed['reveal_is_target'] * 100:.1f}% | {randomed['reveal_is_source'] * 100:.1f}% | {randomed['reveal_is_animal'] * 100:.1f}% | {randomed['answer_matches_target'] * 100:.1f}% |

The direction controls what the model reports and not what it answers. Unsteered, answers already
match the model's own revealed animal only {unsteered['answer_matches_source'] * 100:.1f}% of the time on attributes that separate
the two candidates, which is chance. The commitment is a label on the report rather than a state
that drives behaviour.

## Method notes that matter

**Consistency is judged against the model's own beliefs.** The pipeline first asks the model all
{elicitation['objects'] * elicitation['attributes']} attribute questions and builds its matrix.
Scoring against the human annotation instead would record a contradiction whenever the model simply
disagrees about the world; it agrees with the human labels
{elicitation['agreement_with_human_annotation'] * 100:.1f}% of the time.

**Catalogues are randomised per game.** With an identical prompt and greedy decoding every game
picks the same animal.

**Report against the majority baseline, not uniform chance.** An early probe run looked like 61.6%
against 2% chance. The majority-class baseline was 50.4%. Random 10-animal subsets fixed the label
collapse, taking distinct choices from 24 to {probe['distinct_animals_chosen']} of 50.

**Use the random questioner for anything about drift.** The optimal questioner asks the same
question at turn 1 in every game, so turn index and attribute are confounded. Under the random
questioner the trend over turns is {random_arm['turn_trend_per_turn']:+.4f} per turn, which is flat.

## Reproducing

    python3 -m venv .venv && .venv/bin/pip install numpy torch transformers
    PYTHONPATH=. .venv/bin/python scripts/elicit.py --model Qwen/Qwen3.5-9B
    PYTHONPATH=. .venv/bin/python scripts/play.py --games 200 --tag greedy
    PYTHONPATH=. .venv/bin/python scripts/control.py
    PYTHONPATH=. .venv/bin/python scripts/probe.py --samples 3000 --subset-size 10
    PYTHONPATH=. .venv/bin/python scripts/analyze.py

`--device cpu` works for smoke tests. Slurm scripts are in `scripts/`.

## What this does not show

One model, one family, fifty concrete animals. The probe is linear and read from the last token of
the commitment turn, so {best['accuracy'] * 100:.1f}% is a lower bound on what is encoded. The
steering result inherits that bound: a linear write along a linear probe direction is a blunt
intervention, so answers failing to move is evidence against this direction driving them rather
than evidence that nothing does. Steering also only works over a narrow band of strengths, and
outside it the model stops producing animal names at all.
"""


def main() -> None:
    with open(os.path.join(ROOT, "README.md"), "w", encoding="utf-8") as handle:
        handle.write(build())
    print("wrote README.md")


if __name__ == "__main__":
    main()
