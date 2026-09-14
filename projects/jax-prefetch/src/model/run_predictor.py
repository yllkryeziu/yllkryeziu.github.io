import json
import os
import platform
import subprocess
import time

import jax
import numpy as np

from src.data.features import Features
from src.data.loaders import Dataset, load_msnbc, load_nasa
from src.data.prepare import CACHE_DIR, RESULTS_DIR
from src.model.baselines import (
    MostFrequentBaseline,
    select_backoff_first_order,
    select_backoff_second_order,
)
from src.model.metrics import PredictionAccumulator
from src.model.train import MlpPredictor, TrainingConfig, measure_inference_latency, train_model

EVALUATION_CHUNK = 32768


def cpu_brand() -> str:
    if platform.system() == "Darwin":
        try:
            return subprocess.check_output(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                text=True, stderr=subprocess.DEVNULL).strip()
        except Exception:
            return "unknown"
    try:
        with open("/proc/cpuinfo", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or "unknown"


def environment_provenance() -> dict:
    cpu = cpu_brand()
    return {
        "platform": platform.platform(),
        "python": platform.python_version(),
        "cpu": cpu,
        "jax": jax.__version__,
        "jax_devices": [str(device) for device in jax.devices()],
        "numpy": np.__version__,
    }


def evaluate(model, features: Features, chunk: int = EVALUATION_CHUNK) -> PredictionAccumulator:
    accumulator = PredictionAccumulator()
    count = len(features)
    for start in range(0, count, chunk):
        end = min(start + chunk, count)
        probabilities = model.predict(features, start, end)
        accumulator.update(np.asarray(probabilities, dtype=np.float64), features.labels[start:end])
    return accumulator


def run_dataset(dataset: Dataset, config: TrainingConfig, store_predictions: bool) -> dict:
    train_features = dataset.features["train"]
    validation_features = dataset.features["val"]
    test_features = dataset.features["test"]

    params, training_info = train_model(
        train_features, validation_features, dataset.vocabulary_size, config
    )
    mlp = MlpPredictor(params)

    most_frequent = MostFrequentBaseline(train_features, dataset.vocabulary_size)
    markov1, markov1_trials = select_backoff_first_order(
        train_features, validation_features, dataset.vocabulary_size
    )
    markov2, markov2_trials = select_backoff_second_order(
        train_features, validation_features, dataset.vocabulary_size, markov1
    )

    models = {
        "most_frequent": most_frequent,
        "markov_order1": markov1,
        "markov_order2_backoff": markov2,
        "jax_mlp": mlp,
    }

    test_results = {}
    accumulators = {}
    for name, model in models.items():
        started = time.perf_counter()
        accumulator = evaluate(model, test_features)
        accumulators[name] = accumulator
        summary = accumulator.summary()
        summary["evaluation_seconds"] = time.perf_counter() - started
        test_results[name] = summary

    validation_accumulators = {
        name: evaluate(model, validation_features) for name, model in models.items()
    }
    validation_results = {
        name: accumulator.summary() for name, accumulator in validation_accumulators.items()
    }

    latency = measure_inference_latency(params, test_features)

    if store_predictions:
        stored = {}
        for split, source in (("test", accumulators), ("val", validation_accumulators)):
            mlp_ids, mlp_probabilities = source["jax_mlp"].predictions()
            markov_ids, markov_probabilities = source["markov_order1"].predictions()
            stored[f"{split}_mlp_top_ids"] = mlp_ids
            stored[f"{split}_mlp_top_probabilities"] = mlp_probabilities
            stored[f"{split}_markov1_top_ids"] = markov_ids
            stored[f"{split}_markov1_top_probabilities"] = markov_probabilities
        np.savez_compressed(os.path.join(CACHE_DIR, "nasa_predictions.npz"), **stored)
        np.savez_compressed(
            os.path.join(CACHE_DIR, "nasa_markov1_table.npz"),
            table=markov1.table.astype(np.float32),
        )

    return {
        "dataset": dataset.name,
        "vocabulary_size": dataset.vocabulary_size,
        "split_sizes": {name: len(value) for name, value in dataset.features.items()},
        "training": training_info,
        "backoff_selection": {
            "markov_order1": {"trials": markov1_trials, "chosen": markov1.backoff},
            "markov_order2_backoff": {"trials": markov2_trials, "chosen": markov2.backoff},
        },
        "validation": validation_results,
        "test": test_results,
        "inference_latency": latency,
        "parameter_count": training_info["parameter_count"],
    }


def main() -> None:
    os.makedirs(RESULTS_DIR, exist_ok=True)
    provenance = environment_provenance()

    nasa = load_nasa()
    nasa_report = run_dataset(nasa, TrainingConfig(seed=0, epochs=20), store_predictions=True)
    nasa_report["environment"] = provenance
    with open(os.path.join(RESULTS_DIR, "predictor_nasa.json"), "w") as handle:
        json.dump(nasa_report, handle, indent=2)

    msnbc, msnbc_stats = load_msnbc()
    msnbc_report = run_dataset(msnbc, TrainingConfig(seed=0, epochs=8), store_predictions=False)
    msnbc_report["environment"] = provenance
    msnbc_report["dataset_stats"] = msnbc_stats
    with open(os.path.join(RESULTS_DIR, "predictor_msnbc.json"), "w") as handle:
        json.dump(msnbc_report, handle, indent=2)

    for name, report in (("nasa", nasa_report), ("msnbc", msnbc_report)):
        print(name)
        for model, summary in report["test"].items():
            print(
                f"  {model:24s} top1={summary['top1_accuracy']:.4f} "
                f"top3={summary['top3_accuracy']:.4f} top5={summary['top5_accuracy']:.4f} "
                f"ce={summary['cross_entropy_nats']:.4f} ece={summary['expected_calibration_error']:.4f}"
            )


if __name__ == "__main__":
    main()
