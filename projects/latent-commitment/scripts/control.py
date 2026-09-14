import argparse
import json
import os

import numpy as np

from src.game.phrasing import question_for
from src.game.world import load_model_world, load_reference_world
from src.model import runner as rn

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")

NAMED_RULES = (
    "You are thinking of a {animal}.\n"
    "Answer every question about it with exactly one word, Yes or No.\n"
    "Every answer must be truthful about a {animal}."
)


def named_messages(animal: str, question: str) -> list[dict]:
    return [
        {"role": "system", "content": NAMED_RULES.format(animal=animal)},
        {"role": "user", "content": question},
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3.5-9B")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--transcripts", default=os.path.join(RESULTS, "transcripts_greedy.json"))
    parser.add_argument("--world", default=os.path.join(RESULTS, "model_matrix.npy"))
    parser.add_argument("--out", default=os.path.join(RESULTS, "control.json"))
    args = parser.parse_args()

    reference = load_reference_world()
    world = load_model_world(args.world, reference)
    model = rn.load(args.model, device=args.device)

    with open(args.transcripts, encoding="utf-8") as handle:
        transcripts = json.load(handle)

    question_index = {question_for(a): i for i, a in enumerate(world.attributes)}

    prompts = []
    keys = []
    for game, record in enumerate(transcripts):
        revealed = record["revealed_index"]
        if revealed is None:
            continue
        animal = world.display(revealed)
        for turn, (question, answer) in enumerate(zip(record["questions"], record["answers"])):
            attribute = question_index.get(question)
            if attribute is None:
                continue
            prompts.append(model.chat_prefix(named_messages(animal, question)))
            keys.append((game, turn, revealed, attribute, answer == "Yes"))

    probabilities = rn.yes_probability(model, prompts, batch_size=args.batch_size)

    named_vs_elicited = []
    named_vs_ingame = []
    ingame_vs_elicited = []
    per_game_named = {}
    for (game, turn, revealed, attribute, in_game_yes), probability in zip(keys, probabilities):
        named_yes = probability >= 0.5
        elicited_yes = bool(world.matrix[revealed, attribute])
        named_vs_elicited.append(named_yes == elicited_yes)
        named_vs_ingame.append(named_yes == in_game_yes)
        ingame_vs_elicited.append(in_game_yes == elicited_yes)
        per_game_named.setdefault(game, []).append(named_yes == elicited_yes)

    perfect_named = sum(1 for values in per_game_named.values() if all(values))

    report = {
        "model": args.model,
        "transcripts": os.path.basename(args.transcripts),
        "comparisons": len(keys),
        "games": len(per_game_named),
        "named_context_vs_elicited_beliefs": float(np.mean(named_vs_elicited)),
        "in_game_vs_elicited_beliefs": float(np.mean(ingame_vs_elicited)),
        "named_context_vs_in_game_answers": float(np.mean(named_vs_ingame)),
        "games_where_named_context_fully_matches_beliefs": perfect_named,
        "interpretation": (
            "If naming the animal restores agreement with the model's own elicited beliefs while "
            "the in-game agreement stays low, the beliefs are stable and the failure is in holding "
            "the commitment. If naming does not restore agreement, the elicited beliefs simply do "
            "not transfer across prompt context and the game measurement is confounded."
        ),
    }

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(f"named context vs elicited beliefs : {report['named_context_vs_elicited_beliefs']:.3f}")
    print(f"in-game       vs elicited beliefs : {report['in_game_vs_elicited_beliefs']:.3f}")
    print(f"named context vs in-game answers  : {report['named_context_vs_in_game_answers']:.3f}")
    print(f"games fully matching beliefs when named: {perfect_named}/{report['games']}")


if __name__ == "__main__":
    main()
