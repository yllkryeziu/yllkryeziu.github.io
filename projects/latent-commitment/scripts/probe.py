import argparse
import json
import os
import time

import numpy as np
import torch

from src.game.world import load_model_world, load_reference_world
from src.model import runner as rn
from src.model.prompts import REVEAL_TURN, commit_messages, game_messages

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")


def match_object(world, text: str) -> int | None:
    cleaned = text.strip().strip(".!\"'").lower()
    for index in range(world.object_count):
        if cleaned == world.display(index).lower():
            return index
    for index in range(world.object_count):
        if world.display(index).lower() in cleaned:
            return index
    return None


def softmax_rows(scores: np.ndarray) -> np.ndarray:
    shifted = scores - scores.max(axis=1, keepdims=True)
    exponent = np.exp(shifted)
    return exponent / exponent.sum(axis=1, keepdims=True)


def train_logistic(features: np.ndarray, labels: np.ndarray, classes: int,
                   epochs: int = 300, learning_rate: float = 0.05,
                   weight_decay: float = 1e-3, seed: int = 0) -> np.ndarray:
    torch.manual_seed(seed)
    x = torch.tensor(features, dtype=torch.float32)
    x = (x - x.mean(0)) / (x.std(0) + 1e-6)
    y = torch.tensor(labels, dtype=torch.long)
    weights = torch.zeros(x.shape[1], classes, requires_grad=True)
    bias = torch.zeros(classes, requires_grad=True)
    optimiser = torch.optim.Adam([weights, bias], lr=learning_rate, weight_decay=weight_decay)
    for _ in range(epochs):
        optimiser.zero_grad()
        loss = torch.nn.functional.cross_entropy(x @ weights + bias, y)
        loss.backward()
        optimiser.step()
    return np.concatenate([weights.detach().numpy(), bias.detach().numpy()[None, :]], axis=0)


def apply_probe(probe: np.ndarray, features: np.ndarray, stats: tuple) -> np.ndarray:
    mean, std = stats
    normalised = (features - mean) / (std + 1e-6)
    return normalised @ probe[:-1] + probe[-1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3.5-9B")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--samples", type=int, default=2000)
    parser.add_argument("--layers", type=int, nargs="*", default=None)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--world", default=os.path.join(RESULTS, "model_matrix.npy"))
    parser.add_argument("--transcripts", default=os.path.join(RESULTS, "transcripts_greedy.json"))
    args = parser.parse_args()

    started = time.perf_counter()
    reference = load_reference_world()
    world = load_model_world(args.world, reference) if os.path.exists(args.world) else reference
    model = rn.load(args.model, device=args.device)
    generator = np.random.default_rng(args.seed)

    depth = model.model.config.num_hidden_layers
    layers = args.layers if args.layers else [depth // 4, depth // 2, 3 * depth // 4, depth]

    orders = [list(generator.permutation(world.object_count)) for _ in range(args.samples)]
    commit_prompts = [model.chat_prefix(commit_messages(world, order)) for order in orders]
    reveal_prompts = [
        model.chat_prefix(game_messages(world, [], [], REVEAL_TURN, order)) for order in orders
    ]

    reveals = rn.generate(model, reveal_prompts, max_new_tokens=10, temperature=0.0,
                          batch_size=args.batch_size)
    labels = [match_object(world, text) for text in reveals]
    keep = [i for i, label in enumerate(labels) if label is not None]
    print(f"parsed {len(keep)}/{args.samples} immediate reveals")

    distinct = len({labels[i] for i in keep})
    print(f"distinct animals chosen across shuffled catalogues: {distinct}/{world.object_count}")

    report = {
        "model": args.model,
        "samples": args.samples,
        "parsed": len(keep),
        "distinct_animals_chosen": distinct,
        "chance_accuracy": 1.0 / world.object_count,
        "layers": {},
    }

    split = int(0.8 * len(keep))
    train_idx = keep[:split]
    test_idx = keep[split:]
    y_train = np.array([labels[i] for i in train_idx])
    y_test = np.array([labels[i] for i in test_idx])

    transfer = None
    if os.path.exists(args.transcripts):
        with open(args.transcripts, encoding="utf-8") as handle:
            transfer = json.load(handle)

    for layer in layers:
        states = rn.hidden_state(model, [commit_prompts[i] for i in keep], layer,
                                 batch_size=args.batch_size).numpy()
        x_train = states[:split]
        x_test = states[split:]
        stats = (x_train.mean(0), x_train.std(0))
        probe = train_logistic(x_train, y_train, world.object_count, seed=args.seed)
        scores = apply_probe(probe, x_test, stats)
        predictions = scores.argmax(axis=1)
        probabilities = softmax_rows(scores)
        accuracy = float((predictions == y_test).mean())
        top5 = float(np.mean([
            y_test[i] in np.argsort(-scores[i])[:5] for i in range(len(y_test))
        ]))
        report["layers"][str(layer)] = {
            "accuracy": accuracy,
            "top5_accuracy": top5,
            "mean_confidence": float(probabilities.max(axis=1).mean()),
            "train_examples": len(train_idx),
            "test_examples": len(test_idx),
        }
        print(f"layer {layer}: accuracy {accuracy:.3f} top5 {top5:.3f} "
              f"(chance {1.0 / world.object_count:.3f})")

    report["wall_clock_seconds"] = time.perf_counter() - started
    os.makedirs(RESULTS, exist_ok=True)
    with open(os.path.join(RESULTS, "probe.json"), "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)


if __name__ == "__main__":
    main()
