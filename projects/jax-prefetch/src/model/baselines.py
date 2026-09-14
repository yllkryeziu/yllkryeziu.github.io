import numpy as np
from scipy import sparse

from src.data.features import Features

UNIGRAM_SMOOTHING = 1.0
BACKOFF_GRID = (0.5, 1.0, 2.0, 5.0, 10.0, 25.0, 50.0, 100.0, 200.0, 400.0, 800.0)


def unigram_distribution(train: Features, vocabulary_size: int) -> np.ndarray:
    counts = np.bincount(train.labels, minlength=vocabulary_size).astype(np.float64)
    return (counts + UNIGRAM_SMOOTHING) / (counts.sum() + UNIGRAM_SMOOTHING * vocabulary_size)


class MostFrequentBaseline:
    name = "most_frequent"

    def __init__(self, train: Features, vocabulary_size: int) -> None:
        self.distribution = unigram_distribution(train, vocabulary_size)

    def predict(self, features: Features, start: int, end: int) -> np.ndarray:
        return np.repeat(self.distribution[None, :], end - start, axis=0)


class FirstOrderCounts:
    def __init__(self, train: Features, vocabulary_size: int) -> None:
        self.vocabulary_size = vocabulary_size
        self.unigram = unigram_distribution(train, vocabulary_size)
        flat = train.current.astype(np.int64) * vocabulary_size + train.labels.astype(np.int64)
        self.counts = np.bincount(flat, minlength=vocabulary_size * vocabulary_size).astype(np.float64)
        self.counts = self.counts.reshape(vocabulary_size, vocabulary_size)
        self.row_sums = self.counts.sum(axis=1, keepdims=True)


class FirstOrderMarkovBaseline:
    name = "markov_order1"

    def __init__(self, counts: FirstOrderCounts, backoff: float) -> None:
        self.backoff = backoff
        self.vocabulary_size = counts.vocabulary_size
        self.table = (counts.counts + backoff * counts.unigram[None, :]) / (counts.row_sums + backoff)

    def predict(self, features: Features, start: int, end: int) -> np.ndarray:
        return self.table[features.current[start:end]]


class SecondOrderCounts:
    def __init__(self, train: Features, vocabulary_size: int) -> None:
        self.vocabulary_size = vocabulary_size
        pair_keys = train.previous.astype(np.int64) * vocabulary_size + train.current.astype(np.int64)
        unique_keys, rows = np.unique(pair_keys, return_inverse=True)
        self.key_order = unique_keys
        self.counts = sparse.csr_matrix(
            (np.ones(rows.shape[0]), (rows, train.labels.astype(np.int64))),
            shape=(unique_keys.shape[0], vocabulary_size),
        )
        self.counts.sum_duplicates()
        self.row_sums = np.asarray(self.counts.sum(axis=1)).ravel()

    def lookup(self, keys: np.ndarray) -> np.ndarray:
        positions = np.searchsorted(self.key_order, keys)
        positions = np.clip(positions, 0, self.key_order.shape[0] - 1)
        found = self.key_order[positions] == keys
        return np.where(found, positions, -1)


class SecondOrderMarkovBaseline:
    name = "markov_order2_backoff"

    def __init__(
        self, counts: SecondOrderCounts, first_order: FirstOrderMarkovBaseline, backoff: float
    ) -> None:
        self.counts = counts
        self.first_order = first_order
        self.backoff = backoff
        self.vocabulary_size = counts.vocabulary_size

    def predict(self, features: Features, start: int, end: int) -> np.ndarray:
        current = features.current[start:end]
        previous = features.previous[start:end]
        base = self.first_order.table[current]
        keys = previous.astype(np.int64) * self.vocabulary_size + current.astype(np.int64)
        rows = self.counts.lookup(keys)
        known = rows >= 0
        if not np.any(known):
            return base
        dense = self.counts.counts[rows[known]].toarray()
        sums = self.counts.row_sums[rows[known]][:, None]
        result = base.copy()
        result[known] = (dense + self.backoff * base[known]) / (sums + self.backoff)
        return result


def cross_entropy(model, features: Features, chunk_size: int = 65536) -> float:
    total = 0.0
    count = len(features)
    for start in range(0, count, chunk_size):
        end = min(start + chunk_size, count)
        probabilities = model.predict(features, start, end)
        picked = probabilities[np.arange(end - start), features.labels[start:end]]
        total += float(np.log(np.maximum(picked, 1e-12)).sum())
    return -total / count


def select_backoff_first_order(
    train: Features, validation: Features, vocabulary_size: int
) -> tuple[FirstOrderMarkovBaseline, list[dict]]:
    counts = FirstOrderCounts(train, vocabulary_size)
    trials = []
    best = None
    for backoff in BACKOFF_GRID:
        model = FirstOrderMarkovBaseline(counts, backoff)
        loss = cross_entropy(model, validation)
        trials.append({"backoff": backoff, "val_cross_entropy_nats": loss})
        if best is None or loss < best[0]:
            best = (loss, model)
    return best[1], trials


def select_backoff_second_order(
    train: Features,
    validation: Features,
    vocabulary_size: int,
    first_order: FirstOrderMarkovBaseline,
) -> tuple[SecondOrderMarkovBaseline, list[dict]]:
    counts = SecondOrderCounts(train, vocabulary_size)
    trials = []
    best = None
    for backoff in BACKOFF_GRID:
        model = SecondOrderMarkovBaseline(counts, first_order, backoff)
        loss = cross_entropy(model, validation)
        trials.append({"backoff": backoff, "val_cross_entropy_nats": loss})
        if best is None or loss < best[0]:
            best = (loss, model)
    return best[1], trials
