import argparse
import json
import os
import time

import numpy as np

from src.game.world import load_model_world, load_reference_world
from src.model import runner as rn
from src.model.prompts import REVEAL_TURN, commit_messages, game_messages, subset_orders
from src.probe.linear import accuracy_at_k, apply_probe, match_object, softmax_rows, train_logistic

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3.5-9B")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--samples", type=int, default=3000)
    parser.add_argument("--layers", type=int, nargs="*", default=None)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--subset-size", type=int, default=10)
    parser.add_argument("--world", default=os.path.join(RESULTS, "model_matrix.npy"))
    parser.add_argument("--transcripts", default=os.path.join(RESULTS, "transcripts_greedy.json"))
    parser.add_argument("--play-seed", type=int, default=0)
    parser.add_argument("--out", default=os.path.join(RESULTS, "probe.json"))
    args = parser.parse_args()

    started = time.perf_counter()
    reference = load_reference_world()
    world = load_model_world(args.world, reference)
    model = rn.load(args.model, device=args.device)
    generator = np.random.default_rng(args.seed)

    depth = model.model.config.num_hidden_layers
    layers = args.layers if args.layers else [depth // 4, depth // 2, 3 * depth // 4, depth]

    orders = subset_orders(world, args.samples, args.subset_size, generator)
    commit_prompts = [model.chat_prefix(commit_messages(world, order)) for order in orders]
    immediate_prompts = [
        model.chat_prefix(game_messages(world, [], [], REVEAL_TURN, order)) for order in orders
    ]

    reveals = rn.generate(model, immediate_prompts, max_new_tokens=10, temperature=0.0,
                          batch_size=args.batch_size)
    labels = [match_object(world, text) for text in reveals]
    keep = [i for i, label in enumerate(labels) if label is not None]
    y = np.array([labels[i] for i in keep])
    print(f"parsed {len(keep)}/{args.samples} immediate reveals, "
          f"{len(set(y.tolist()))} distinct animals")

    split = int(0.8 * len(keep))
    y_train, y_test = y[:split], y[split:]

    transcripts = None
    if os.path.exists(args.transcripts):
        with open(args.transcripts, encoding="utf-8") as handle:
            transcripts = json.load(handle)

    game_prompts = []
    game_labels = []
    if transcripts:
        play_generator = np.random.default_rng(args.play_seed)
        game_orders = subset_orders(world, len(transcripts), args.subset_size, play_generator)
        for order, record in zip(game_orders, transcripts):
            if record["revealed_index"] is None:
                continue
            game_prompts.append(model.chat_prefix(commit_messages(world, order)))
            game_labels.append(record["revealed_index"])
        print(f"transfer set: {len(game_prompts)} games with a parsed post-game reveal")

    report = {
        "model": args.model,
        "samples": args.samples,
        "parsed": len(keep),
        "distinct_animals_chosen": len(set(y.tolist())),
        "chance_accuracy": 1.0 / world.object_count,
        "subset_size": args.subset_size,
        "most_common_baseline": float(np.bincount(y_test, minlength=world.object_count).max() / len(y_test)),
        "transfer_most_common_baseline": (
            float(np.bincount(np.array(game_labels), minlength=world.object_count).max() / len(game_labels))
            if game_labels else None),
        "transfer_games": len(game_prompts),
        "layers": {},
        "question": (
            "A probe is trained on commitment-turn activations to predict the animal the model "
            "reveals when asked immediately, with no questions in between. Transfer accuracy "
            "applies that probe to the commitment turn of full 20-question games and asks whether "
            "it predicts the animal revealed at the end. High probe accuracy with low transfer "
            "accuracy means a commitment is represented and then abandoned."
        ),
    }

    for layer in layers:
        states = rn.hidden_state(model, [commit_prompts[i] for i in keep], layer,
                                 batch_size=args.batch_size).numpy()
        probe, stats = train_logistic(states[:split], y_train, world.object_count, seed=args.seed)
        scores = apply_probe(probe, states[split:], stats)
        entry = {
            "accuracy": accuracy_at_k(scores, y_test, 1),
            "top5_accuracy": accuracy_at_k(scores, y_test, 5),
            "mean_confidence": float(softmax_rows(scores).max(axis=1).mean()),
            "train_examples": split,
            "test_examples": len(y_test),
        }

        if game_prompts:
            game_states = rn.hidden_state(model, game_prompts, layer,
                                          batch_size=args.batch_size).numpy()
            game_scores = apply_probe(probe, game_states, stats)
            truth = np.array(game_labels)
            entry["transfer_accuracy"] = accuracy_at_k(game_scores, truth, 1)
            entry["transfer_top5_accuracy"] = accuracy_at_k(game_scores, truth, 5)
            entry["transfer_mean_confidence"] = float(
                softmax_rows(game_scores).max(axis=1).mean())

        report["layers"][str(layer)] = entry
        line = (f"layer {layer:3d}: probe {entry['accuracy']:.3f} "
                f"(top5 {entry['top5_accuracy']:.3f})")
        if "transfer_accuracy" in entry:
            line += (f"  transfer {entry['transfer_accuracy']:.3f} "
                     f"(top5 {entry['transfer_top5_accuracy']:.3f})")
        print(line + f"   chance {1.0 / world.object_count:.3f}")

    report["wall_clock_seconds"] = time.perf_counter() - started
    os.makedirs(RESULTS, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)


if __name__ == "__main__":
    main()
