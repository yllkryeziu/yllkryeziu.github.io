# latent-commitment

Does a language model actually hold a secret it never wrote down?

Ask it to think of an animal and not say which. Nothing about the choice enters the transcript, so
either the choice lives in the model's state or every answer is improvised. 20 Questions makes that
testable, because the ground truth is computable.

Every number below is produced by `scripts/run_all.sh` and written to `results/`.

## Results

Qwen3.5-9B, 50 animals, 85 binary attributes from Animals with Attributes 2.

| arm | games | contradicted | median death turn | self-agreement |
| --- | ---: | ---: | ---: | ---: |
| optimal questioner, greedy | 200 | 99.5% | 8 | 77.5% |
| optimal questioner, T = 0.7 | 200 | 99.0% | 8 | 71.9% |
| optimal questioner, T = 1.0 | 200 | 100.0% | 8 | 68.2% |
| random questioner, greedy | 300 | 96.3% | 12 | 81.9% |
| 10-animal subsets, greedy | 300 | 84.7% | 8 | 74.1% |

Perfect play identifies the animal in a mean of 5.72 questions against a floor of log2(50) = 5.64,
so a twenty-question game leaves fourteen turns of slack. The model still contradicts itself in
almost every game.

### The control

A high contradiction rate could mean the model never committed, or that its beliefs shift with
prompt context. Re-asking every question with the animal named explicitly separates them.

| condition | 50 animals | 10-animal subsets |
| --- | ---: | ---: |
| animal named in the prompt | 92.8% | 89.9% |
| animal held only in its head | 77.5% | 74.1% |
| cost of latency | 15.3 pts | 15.7 pts |

The gap replicates across two designs. Beliefs are stable when the referent is explicit, so most of
the in-game inconsistency is failure to hold the referent.

### Apparent consistency tracks question difficulty

Self-agreement correlates with attribute skew at r = 0.603. The
25 balanced attributes, the ones that discriminate between
animals, get 70.6% agreement. The
35 skewed ones, answerable without knowing the secret at all,
get 91.0%.

This also explains why an optimal questioner kills games faster than a random one: maximising
information gain means choosing the most balanced question, which is exactly where the model is
weakest.

### Is anything represented

A linear probe on commitment-turn activations, layer 32, 2992 samples.

| measurement | top-1 | vs majority | top-5 |
| --- | ---: | ---: | ---: |
| majority-class baseline | 13.5% | 1.0x | - |
| probe, animal named immediately | 49.9% | 3.7x | 85.3% |
| transfer, animal revealed after the game | 17.3% | 1.3x | 48.0% |

The commitment is real and linearly decodable at the moment it is made. It largely does not survive
the game.

### Is the representation causal

Writing the probe's source-to-target direction into the residual stream at layer 24. The source is
the animal the model names on its own; the target is a different animal from the same catalogue.
A random direction of equal norm is the control.

| condition | names target | names own choice | still an animal | answers match target |
| --- | ---: | ---: | ---: | ---: |
| unsteered | 0.0% | 100.0% | 100.0% | 49.6% |
| probe direction | 38.5% | 2.0% | 97.0% | 51.1% |
| random direction | 6.7% | 33.4% | 95.0% | 50.2% |

The direction controls what the model reports and not what it answers. Unsteered, answers already
match the model's own revealed animal only 50.4% of the time on attributes that separate
the two candidates, which is chance. The commitment is a label on the report rather than a state
that drives behaviour.

## Method notes that matter

**Consistency is judged against the model's own beliefs.** The pipeline first asks the model all
4250 attribute questions and builds its matrix.
Scoring against the human annotation instead would record a contradiction whenever the model simply
disagrees about the world; it agrees with the human labels
79.2% of the time.

**Catalogues are randomised per game.** With an identical prompt and greedy decoding every game
picks the same animal.

**Report against the majority baseline, not uniform chance.** An early probe run looked like 61.6%
against 2% chance. The majority-class baseline was 50.4%. Random 10-animal subsets fixed the label
collapse, taking distinct choices from 24 to 49 of 50.

**Use the random questioner for anything about drift.** The optimal questioner asks the same
question at turn 1 in every game, so turn index and attribute are confounded. Under the random
questioner the trend over turns is -0.0001 per turn, which is flat.

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
the commitment turn, so 49.9% is a lower bound on what is encoded. The
steering result inherits that bound: a linear write along a linear probe direction is a blunt
intervention, so answers failing to move is evidence against this direction driving them rather
than evidence that nothing does. Steering also only works over a narrow band of strengths, and
outside it the model stops producing animal names at all.
