import json
import os
from dataclasses import dataclass

import numpy as np

from src.data.prepare import CACHE_DIR

NON_CACHEABLE_PREFIXES = ("/cgi-bin/", "/htbin/")


@dataclass(frozen=True)
class ReplayWindow:
    session_starts: np.ndarray
    offsets: np.ndarray
    path_indices: np.ndarray
    response_bytes: np.ndarray
    think_times: np.ndarray
    decision_indices: np.ndarray
    real_start_epoch: int
    real_end_epoch: int


@dataclass(frozen=True)
class Workload:
    offsets: np.ndarray
    path_indices: np.ndarray
    epochs: np.ndarray
    response_bytes: np.ndarray
    current_vocab: np.ndarray
    path_names: list[str]
    cacheable: np.ndarray
    predicted_bytes: np.ndarray
    vocab_to_path: np.ndarray
    mlp_top_ids: np.ndarray
    mlp_top_probabilities: np.ndarray
    markov1_top_ids: np.ndarray
    markov1_top_probabilities: np.ndarray
    markov1_table: np.ndarray
    calibration: dict


def load_workload(split: str = "test") -> Workload:
    arrays = np.load(os.path.join(CACHE_DIR, "nasa_sessions.npz"))
    predictions = np.load(os.path.join(CACHE_DIR, "nasa_predictions.npz"))
    markov_table = np.load(os.path.join(CACHE_DIR, "nasa_markov1_table.npz"))["table"]
    with open(os.path.join(CACHE_DIR, "nasa_paths.json")) as handle:
        meta = json.load(handle)

    path_names = meta["paths"]
    path_to_vocab = arrays["path_to_vocab"]
    vocabulary_size = int(path_to_vocab.max()) + 1

    train_paths = arrays["train_paths"]
    train_bytes = arrays["train_response_bytes"]
    global_median = float(np.median(train_bytes))
    predicted_bytes = np.full(len(path_names), global_median, dtype=np.float64)
    order = np.argsort(train_paths, kind="stable")
    sorted_paths = train_paths[order]
    sorted_bytes = train_bytes[order]
    boundaries = np.searchsorted(sorted_paths, np.arange(len(path_names) + 1))
    for path_index in range(len(path_names)):
        start, end = boundaries[path_index], boundaries[path_index + 1]
        if end > start:
            predicted_bytes[path_index] = float(np.median(sorted_bytes[start:end]))

    cacheable = np.array(
        [not name.startswith(NON_CACHEABLE_PREFIXES) for name in path_names], dtype=bool
    )

    path_lookup = {name: index for index, name in enumerate(path_names)}
    vocab_to_path = np.full(vocabulary_size, -1, dtype=np.int64)
    for path, vocab_id in meta["vocabulary"].items():
        vocab_to_path[vocab_id] = path_lookup[path]

    split_paths = arrays[f"{split}_paths"]
    calibration = {
        "non_cacheable_prefixes": list(NON_CACHEABLE_PREFIXES),
        "non_cacheable_path_count": int((~cacheable).sum()),
        "split": split,
        "non_cacheable_request_fraction": float((~cacheable[split_paths]).mean()),
        "predicted_bytes_source": "median_response_bytes_per_path_over_july_training_split",
        "predicted_bytes_global_fallback": global_median,
        "distinct_paths": len(path_names),
    }

    return Workload(
        offsets=arrays[f"{split}_offsets"],
        path_indices=split_paths,
        epochs=arrays[f"{split}_epochs"],
        response_bytes=arrays[f"{split}_response_bytes"],
        current_vocab=path_to_vocab[split_paths],
        path_names=path_names,
        cacheable=cacheable,
        predicted_bytes=predicted_bytes,
        vocab_to_path=vocab_to_path,
        mlp_top_ids=predictions[f"{split}_mlp_top_ids"],
        mlp_top_probabilities=predictions[f"{split}_mlp_top_probabilities"],
        markov1_top_ids=predictions[f"{split}_markov1_top_ids"],
        markov1_top_probabilities=predictions[f"{split}_markov1_top_probabilities"],
        markov1_table=markov_table,
        calibration=calibration,
    )


def sample_window(
    workload: Workload, seed: int, window_hours: float, time_scale: float
) -> ReplayWindow:
    starts = workload.epochs[workload.offsets[:-1]]
    first, last = int(starts[0]), int(starts[-1])
    window_seconds = int(window_hours * 3600)
    generator = np.random.default_rng(seed)
    latest_start = max(first, last - window_seconds)
    window_start = int(generator.integers(first, latest_start + 1))
    window_end = window_start + window_seconds

    selected = np.nonzero((starts >= window_start) & (starts < window_end))[0]
    lengths = workload.offsets[selected + 1] - workload.offsets[selected]
    new_offsets = np.zeros(len(selected) + 1, dtype=np.int64)
    new_offsets[1:] = np.cumsum(lengths)
    total = int(new_offsets[-1])

    path_indices = np.zeros(total, dtype=np.int64)
    response_bytes = np.zeros(total, dtype=np.float64)
    think_times = np.zeros(total, dtype=np.float64)
    decision_indices = np.zeros(total, dtype=np.int64)
    for position, session in enumerate(selected):
        begin, end = int(workload.offsets[session]), int(workload.offsets[session + 1])
        target = slice(int(new_offsets[position]), int(new_offsets[position + 1]))
        path_indices[target] = workload.path_indices[begin:end]
        response_bytes[target] = workload.response_bytes[begin:end]
        decision_indices[target] = np.arange(begin, end)
        gaps = np.diff(workload.epochs[begin:end]).astype(np.float64) / time_scale
        think_times[target] = np.concatenate([gaps, [0.0]])

    session_starts = (starts[selected].astype(np.float64) - window_start) / time_scale
    return ReplayWindow(
        session_starts=session_starts,
        offsets=new_offsets,
        path_indices=path_indices,
        response_bytes=response_bytes,
        think_times=think_times,
        decision_indices=decision_indices,
        real_start_epoch=window_start,
        real_end_epoch=window_end,
    )
