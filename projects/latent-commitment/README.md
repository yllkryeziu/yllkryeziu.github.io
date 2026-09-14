# latent-commitment

**Status: work in progress.** The game engine and evaluation harness are finished and tested. The
model experiments have not been run yet, so there are no results in this directory.

## The question

When a language model is told to think of something and not reveal it, does a specific object exist
anywhere in the model, or does it improvise every answer and only appear to have committed?

This matters beyond the game. Multi-turn agents assume latent state persists across turns without
being written down, and that assumption is rarely checked.

20 Questions is a good testbed because it gives exact ground truth, which LLM evaluation usually
lacks.

## Design

The model is the answerer. It is given a closed list of 50 animals and asked to pick one, then
answer yes or no questions about it, then reveal it.

Ground truth comes from the [Animals with Attributes 2](https://cvml.ista.ac.at/AwA2/) attribute
matrix: 50 animals by 85 human-annotated binary attributes, with all 50 rows distinct. That single
matrix provides:

- **Exact contradiction detection.** Track the set of animals consistent with every answer so far.
  When it becomes empty, the model has contradicted itself, and this is certain rather than a
  judgement call.
- **The exact posterior** over animals at every turn.
- **An optimal questioner** by information gain, so the questioner is a controlled instrument rather
  than a second noisy model. Perfect play identifies the animal in a mean of 5.72 questions against
  an information-theoretic floor of log2(50) = 5.64, so a 20-question game leaves 14 turns of rope.
- **Labels for probing.**

### Consistency is judged against the model's own beliefs

`scripts/elicit.py` first asks the model all 50 x 85 attribute questions and builds *its* matrix.
Games are then scored against that rather than against the human annotations.

This matters. A model that simply disagrees about whether a lion counts as "black" would otherwise
be scored as inconsistent, which measures disagreement about the world rather than failure to hold a
commitment. The elicitation step also reports agreement with the human annotation as a side result.

### Catalogue order is shuffled per game

With an identical prompt and greedy decoding every game would choose the same animal, so 200 games
would be one game repeated. Each game sees the animal list in a different order.

## Planned experiments

1. **Behavioural.** Survival curve: what fraction of games remain logically possible at each turn.
2. **The determinism control.** The secret never appears in the transcript, so consistency could
   come from the model genuinely holding state, or from it re-deriving the same answer each turn
   from the same prefix. Greedy decoding cannot separate these. Running the same games at
   temperature 0.7 can.
3. **Mechanistic.** Train a linear probe on the residual stream at the commitment turn to decode
   which animal is held, before any question is asked.
4. **Causal.** Steer along the probe direction and check whether later answers follow the steered
   animal.
5. **Training.** Fine-tune on self-consistent games and measure whether consistency and probe
   decodability move together or apart.

## Layout

    src/game/       world, engine, exact consistency, optimal questioner, question phrasing
    src/model/      inference wrapper and prompts
    scripts/        elicit.py, play.py, probe.py
    data/           AwA2 attribute matrix (fetched, gitignored)

## Running

    python3 -m venv .venv && .venv/bin/pip install numpy torch transformers
    PYTHONPATH=. .venv/bin/python scripts/elicit.py --model Qwen/Qwen3.5-9B
    PYTHONPATH=. .venv/bin/python scripts/play.py --games 200 --temperature 0.0 --tag greedy
    PYTHONPATH=. .venv/bin/python scripts/play.py --games 200 --temperature 0.7 --tag sampled
    PYTHONPATH=. .venv/bin/python scripts/probe.py --samples 2000

`--device cpu` works for smoke tests. The Slurm script in `scripts/` excludes one node whose CUDA
driver fails to initialise.
