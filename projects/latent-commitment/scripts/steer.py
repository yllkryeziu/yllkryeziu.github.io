import argparse
import json
import os
import time
from contextlib import contextmanager

import numpy as np
import torch

from src.game.world import load_model_world, load_reference_world
from src.model import runner as rn
from src.model.prompts import REVEAL_TURN, commit_messages, game_messages, subset_orders
from src.probe.linear import class_direction, match_object, train_logistic

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")


def residual_module(model, layer: int, depth: int):
    if layer >= depth:
        return model.model.norm
    return model.model.layers[layer - 1]


@contextmanager
def steering(model, layer: int, depth: int, vector: torch.Tensor | None):
    if vector is None:
        yield
        return

    def hook(module, inputs, output):
        if isinstance(output, tuple):
            return (output[0] + vector.to(output[0].dtype),) + output[1:]
        return output + vector.to(output.dtype)

    handle = residual_module(model, layer, depth).register_forward_hook(hook)
    try:
        yield
    finally:
        handle.remove()


def unit(vector: np.ndarray) -> np.ndarray:
    return vector / (np.linalg.norm(vector) + 1e-9)


def discriminating_attributes(matrix, source: int, target: int, count: int,
                              generator) -> list[int]:
    differing = np.flatnonzero(matrix[source] != matrix[target])
    if len(differing) == 0:
        return []
    take = min(count, len(differing))
    return [int(i) for i in generator.choice(differing, size=take, replace=False)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3.5-9B")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--train-samples", type=int, default=2400)
    parser.add_argument("--eval-samples", type=int, default=300)
    parser.add_argument("--layers", type=int, nargs="*", default=[16, 24, 32])
    parser.add_argument("--alphas", type=float, nargs="*", default=[1.0, 2.0, 4.0, 8.0])
    parser.add_argument("--attributes-per-pair", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--subset-size", type=int, default=10)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--world", default=os.path.join(RESULTS, "model_matrix.npy"))
    parser.add_argument("--out", default=os.path.join(RESULTS, "steering.json"))
    args = parser.parse_args()

    started = time.perf_counter()
    reference = load_reference_world()
    world = load_model_world(args.world, reference)
    model = rn.load(args.model, device=args.device)
    depth = model.model.config.num_hidden_layers
    generator = np.random.default_rng(args.seed)

    total = args.train_samples + args.eval_samples
    orders = subset_orders(world, total, args.subset_size, generator)
    commit_prompts = [model.chat_prefix(commit_messages(world, order)) for order in orders]
    reveal_prompts = [
        model.chat_prefix(game_messages(world, [], [], REVEAL_TURN, order)) for order in orders
    ]

    reveals = rn.generate(model, reveal_prompts, max_new_tokens=10, temperature=0.0,
                          batch_size=args.batch_size)
    chosen = [match_object(world, text) for text in reveals]
    train_index = [i for i in range(args.train_samples) if chosen[i] is not None]
    eval_index = [i for i in range(args.train_samples, total) if chosen[i] is not None]
    print(f"parsed {len(train_index)} train and {len(eval_index)} eval commitments")

    pairs = []
    for i in eval_index:
        source = chosen[i]
        alternatives = [j for j in orders[i] if j != source]
        if not alternatives:
            continue
        target = int(generator.choice(alternatives))
        attributes = discriminating_attributes(
            world.matrix, source, target, args.attributes_per_pair, generator)
        if not attributes:
            continue
        pairs.append({"sample": i, "source": source, "target": target,
                      "attributes": attributes})
    print(f"{len(pairs)} source/target pairs with discriminating attributes")

    question_prompts = []
    question_meta = []
    for pair in pairs:
        order = orders[pair["sample"]]
        for attribute in pair["attributes"]:
            question_prompts.append(
                model.chat_prefix(game_messages(world, [], [], world.question(attribute), order)))
            question_meta.append((pair["source"], pair["target"], attribute))

    eval_reveal_prompts = [reveal_prompts[pair["sample"]] for pair in pairs]

    report = {
        "model": args.model,
        "train_commitments": len(train_index),
        "eval_pairs": len(pairs),
        "questions_per_condition": len(question_prompts),
        "alphas": args.alphas,
        "subset_size": args.subset_size,
        "question": (
            "The probe shows a commitment is linearly decodable. This asks whether that direction "
            "is causal. For each game the model's own choice is the source and a different animal "
            "from the same catalogue is the target. Adding the probe's source-to-target direction "
            "to the residual stream should, if the direction is used rather than merely present, "
            "move both the revealed animal and the Yes/No answers toward the target. Questions are "
            "restricted to attributes where source and target disagree, so agreement with one is "
            "disagreement with the other. A random direction of equal norm is the control."
        ),
        "layers": {},
    }

    for layer in args.layers:
        states = rn.hidden_state(model, [commit_prompts[i] for i in train_index], layer,
                                 batch_size=args.batch_size).numpy()
        labels = np.array([chosen[i] for i in train_index])
        probe, stats = train_logistic(states, labels, world.object_count, seed=args.seed)

        eval_states = rn.hidden_state(model, [commit_prompts[p["sample"]] for p in pairs], layer,
                                      batch_size=args.batch_size).numpy()
        scale = float(np.linalg.norm(eval_states, axis=1).mean())

        directions = np.stack([
            unit(class_direction(probe, stats, pair["target"])
                 - class_direction(probe, stats, pair["source"]))
            for pair in pairs
        ])
        rng = np.random.default_rng(args.seed + layer)
        random_directions = np.stack([
            unit(rng.normal(size=directions.shape[1])) for _ in pairs
        ])

        entries = {}
        for name, bank in (("probe", directions), ("random", random_directions)):
            for alpha in ([0.0] if name == "probe" else []) + list(args.alphas):
                vector = None
                if alpha > 0.0:
                    per_pair = torch.tensor(bank * alpha * scale, dtype=torch.float32,
                                            device=model.device)
                    vector = per_pair
                results = measure(model, world, pairs, question_prompts, question_meta,
                                  eval_reveal_prompts, vector, layer, depth, args.batch_size)
                key = f"{name}_alpha{alpha:g}" if alpha > 0.0 else "unsteered"
                entries[key] = results
                print(f"layer {layer:3d} {key:18s} "
                      f"target_answer {results['answer_matches_target']:.3f}  "
                      f"reveal_target {results['reveal_is_target']:.3f}  "
                      f"reveal_valid {results['reveal_is_animal']:.3f}")

        entries["residual_norm"] = scale
        report["layers"][str(layer)] = entries

    report["wall_clock_seconds"] = time.perf_counter() - started
    os.makedirs(RESULTS, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(f"wrote {args.out}")


def measure(model, world, pairs, question_prompts, question_meta, reveal_prompts,
            vector, layer, depth, batch_size):
    counts_per_pair = [len(pair["attributes"]) for pair in pairs]
    question_vector = None
    reveal_vector = None
    if vector is not None:
        question_vector = torch.repeat_interleave(
            vector, torch.tensor(counts_per_pair, device=vector.device), dim=0)
        reveal_vector = vector

    probabilities = batched_yes(model, question_prompts, question_vector, layer, depth, batch_size)
    matches_target = []
    matches_source = []
    for (source, target, attribute), probability in zip(question_meta, probabilities):
        answer = probability >= 0.5
        matches_target.append(answer == bool(world.matrix[target, attribute]))
        matches_source.append(answer == bool(world.matrix[source, attribute]))

    texts = batched_generate(model, reveal_prompts, reveal_vector, layer, depth, batch_size)
    revealed = [match_object(world, text) for text in texts]
    is_target = [revealed[i] == pairs[i]["target"] for i in range(len(pairs))]
    is_source = [revealed[i] == pairs[i]["source"] for i in range(len(pairs))]

    return {
        "answer_matches_target": float(np.mean(matches_target)),
        "answer_matches_source": float(np.mean(matches_source)),
        "reveal_is_target": float(np.mean(is_target)),
        "reveal_is_source": float(np.mean(is_source)),
        "reveal_is_animal": float(np.mean([r is not None for r in revealed])),
    }


@torch.inference_mode()
def batched_yes(model, prompts, vector, layer, depth, batch_size):
    out = []
    for start in range(0, len(prompts), batch_size):
        chunk = prompts[start:start + batch_size]
        slice_vector = None
        if vector is not None:
            slice_vector = vector[start:start + len(chunk)].unsqueeze(1)
        with steering(model.model, layer, depth, slice_vector):
            out.extend(rn.yes_probability(model, chunk, batch_size=batch_size))
    return out


@torch.inference_mode()
def batched_generate(model, prompts, vector, layer, depth, batch_size):
    out = []
    for start in range(0, len(prompts), batch_size):
        chunk = prompts[start:start + batch_size]
        slice_vector = None
        if vector is not None:
            slice_vector = vector[start:start + len(chunk)].unsqueeze(1)
        with steering(model.model, layer, depth, slice_vector):
            out.extend(rn.generate(model, chunk, max_new_tokens=10, temperature=0.0,
                                   batch_size=batch_size))
    return out


if __name__ == "__main__":
    main()
