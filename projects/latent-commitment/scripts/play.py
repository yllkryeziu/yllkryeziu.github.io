import argparse
import json
import os
import time

import numpy as np

from src.game.engine import (
    apply_answer,
    best_question,
    new_game,
    optimal_game_length,
    random_question,
)
from src.game.world import World, load_model_world, load_reference_world
from src.model import runner as rn
from src.model.prompts import REVEAL_TURN, game_messages

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")


def sample_answer(probability: float, temperature: float,
                  generator: np.random.Generator) -> bool:
    if temperature <= 0.0:
        return probability >= 0.5
    clipped = min(max(probability, 1e-6), 1.0 - 1e-6)
    power = 1.0 / temperature
    yes = clipped ** power
    no = (1.0 - clipped) ** power
    return bool(generator.random() < yes / (yes + no))


def normalise(text: str) -> str:
    return text.strip().strip(".!\"'").lower()


def match_object(world: World, text: str) -> int | None:
    cleaned = normalise(text)
    for index in range(world.object_count):
        name = world.display(index).lower()
        if cleaned == name:
            return index
    for index in range(world.object_count):
        name = world.display(index).lower()
        if name in cleaned or cleaned in name:
            return index
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3.5-9B")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--games", type=int, default=200)
    parser.add_argument("--turns", type=int, default=20)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--questioner", choices=["optimal", "random"], default="optimal")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--world", default=os.path.join(RESULTS, "model_matrix.npy"))
    parser.add_argument("--tag", default="base")
    args = parser.parse_args()

    started = time.perf_counter()
    reference = load_reference_world()
    world = load_model_world(args.world, reference) if os.path.exists(args.world) else reference
    model = rn.load(args.model, device=args.device)
    generator = np.random.default_rng(args.seed)

    states = [new_game(world) for _ in range(args.games)]
    questions = [[] for _ in range(args.games)]
    answers = [[] for _ in range(args.games)]
    died_at = [None] * args.games
    orders = [list(generator.permutation(world.object_count)) for _ in range(args.games)]

    for turn in range(args.turns):
        chosen = []
        for game in range(args.games):
            state = states[game]
            attribute = (best_question(state) if args.questioner == "optimal"
                         else random_question(state, generator))
            if attribute is None:
                attribute = random_question(state, generator)
            chosen.append(attribute)

        prompts = []
        texts = []
        for game in range(args.games):
            attribute = chosen[game]
            text = world.question(attribute) if attribute is not None else "Is it large?"
            texts.append(text)
            prompts.append(model.chat_prefix(
                game_messages(world, questions[game], answers[game], text, orders[game])
            ))

        probabilities = rn.yes_probability(model, prompts, batch_size=args.batch_size)

        for game in range(args.games):
            attribute = chosen[game]
            if attribute is None:
                continue
            said_yes = sample_answer(probabilities[game], args.temperature, generator)
            questions[game].append(texts[game])
            answers[game].append("Yes" if said_yes else "No")
            before = states[game]
            states[game] = apply_answer(before, attribute, said_yes)
            if before.alive and not states[game].alive and died_at[game] is None:
                died_at[game] = turn + 1

    reveal_prompts = [
        model.chat_prefix(
            game_messages(world, questions[game], answers[game], REVEAL_TURN, orders[game]))
        for game in range(args.games)
    ]
    reveals = rn.generate(model, reveal_prompts, max_new_tokens=10,
                          temperature=args.temperature, seed=args.seed)

    revealed = [match_object(world, text) for text in reveals]
    reveal_consistent = [
        bool(states[game].consistent[revealed[game]]) if revealed[game] is not None else False
        for game in range(args.games)
    ]

    survival = []
    for turn in range(1, args.turns + 1):
        alive = sum(1 for d in died_at if d is None or d > turn)
        survival.append({"turn": turn, "alive_fraction": alive / args.games})

    report = {
        "model": args.model,
        "tag": args.tag,
        "games": args.games,
        "turns": args.turns,
        "temperature": args.temperature,
        "questioner": args.questioner,
        "seed": args.seed,
        "catalogue_shuffled_per_game": True,
        "world_source": world.source,
        "perfect_play_questions": optimal_game_length(world),
        "survival_curve": survival,
        "contradicted_fraction": sum(1 for d in died_at if d is not None) / args.games,
        "median_death_turn": (
            float(np.median([d for d in died_at if d is not None]))
            if any(d is not None for d in died_at) else None
        ),
        "reveal_parsed_fraction": sum(1 for r in revealed if r is not None) / args.games,
        "reveal_consistent_fraction": sum(reveal_consistent) / args.games,
        "reveal_distribution": {
            world.display(i): sum(1 for r in revealed if r == i)
            for i in range(world.object_count)
            if any(r == i for r in revealed)
        },
        "wall_clock_seconds": time.perf_counter() - started,
    }

    os.makedirs(RESULTS, exist_ok=True)
    with open(os.path.join(RESULTS, f"play_{args.tag}.json"), "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    with open(os.path.join(RESULTS, f"transcripts_{args.tag}.json"), "w", encoding="utf-8") as handle:
        json.dump([
            {
                "questions": questions[game],
                "answers": answers[game],
                "reveal_text": reveals[game],
                "revealed_index": revealed[game],
                "died_at": died_at[game],
                "final_candidates": states[game].candidate_count,
            }
            for game in range(args.games)
        ], handle, indent=2)

    print(f"contradicted: {report['contradicted_fraction']:.3f} "
          f"median death turn: {report['median_death_turn']} "
          f"reveal consistent: {report['reveal_consistent_fraction']:.3f}")


if __name__ == "__main__":
    main()
