import numpy as np
import torch


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
                   epochs: int = 400, learning_rate: float = 0.05,
                   weight_decay: float = 1e-3, seed: int = 0) -> tuple[np.ndarray, tuple]:
    torch.manual_seed(seed)
    mean = features.mean(0)
    std = features.std(0) + 1e-6
    x = torch.tensor((features - mean) / std, dtype=torch.float32)
    y = torch.tensor(labels, dtype=torch.long)
    weights = torch.zeros(x.shape[1], classes, requires_grad=True)
    bias = torch.zeros(classes, requires_grad=True)
    optimiser = torch.optim.Adam([weights, bias], lr=learning_rate, weight_decay=weight_decay)
    for _ in range(epochs):
        optimiser.zero_grad()
        torch.nn.functional.cross_entropy(x @ weights + bias, y).backward()
        optimiser.step()
    probe = np.concatenate([weights.detach().numpy(), bias.detach().numpy()[None, :]], axis=0)
    return probe, (mean, std)


def apply_probe(probe: np.ndarray, features: np.ndarray, stats: tuple) -> np.ndarray:
    mean, std = stats
    return ((features - mean) / std) @ probe[:-1] + probe[-1]


def accuracy_at_k(scores: np.ndarray, labels: np.ndarray, k: int) -> float:
    top = np.argsort(-scores, axis=1)[:, :k]
    return float(np.mean([labels[i] in top[i] for i in range(len(labels))]))


def class_direction(probe: np.ndarray, stats: tuple, index: int) -> np.ndarray:
    _, std = stats
    return probe[:-1, index] / std
