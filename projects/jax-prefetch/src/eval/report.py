import json
import os

from src.data.prepare import RESULTS_DIR

PREDICTOR_MODEL_ORDER = ("most_frequent", "markov_order1", "markov_order2_backoff", "jax_mlp")
STRATEGY_ORDER = (
    "none",
    "always_top1",
    "always_top2",
    "markov1_top2",
    "static_rule",
    "cost_aware_mlp",
)


def read(name: str) -> dict:
    with open(os.path.join(RESULTS_DIR, name)) as handle:
        return json.load(handle)


def interval(entry: dict, digits: int = 2) -> str:
    if entry is None or entry["mean"] is None:
        return "n/a"
    return f"{entry['mean']:.{digits}f} [{entry['ci_low']:.{digits}f}, {entry['ci_high']:.{digits}f}]"


def predictor_table(report: dict) -> list[str]:
    lines = [
        "| model | top-1 | top-3 | top-5 | cross-entropy (nats) | ECE (15 bins) |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for model in PREDICTOR_MODEL_ORDER:
        row = report["test"][model]
        lines.append(
            f"| {model} | {row['top1_accuracy']:.4f} | {row['top3_accuracy']:.4f} | "
            f"{row['top5_accuracy']:.4f} | {row['cross_entropy_nats']:.4f} | "
            f"{row['expected_calibration_error']:.4f} |"
        )
    return lines


def strategy_table(experiment: dict, regime: str) -> list[str]:
    lines = [
        "| origin concurrency | strategy | p50 ms | p95 ms | p99 ms | cache hit rate | "
        "extra origin requests | prefetch precision |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for concurrency in sorted({row["origin_concurrency"] for row in experiment["main"]}):
        for strategy in STRATEGY_ORDER:
            row = next(
                (
                    item
                    for item in experiment["main"]
                    if item["regime"] == regime
                    and item["origin_concurrency"] == concurrency
                    and item["strategy"] == strategy
                ),
                None,
            )
            if row is None:
                continue
            lines.append(
                f"| {concurrency} | {strategy} | {interval(row['latency_ms_p50'])} | "
                f"{interval(row['latency_ms_p95'])} | {interval(row['latency_ms_p99'])} | "
                f"{interval(row['cache_hit_rate'], 4)} | "
                f"{interval(row['extra_origin_requests_fraction'], 4)} | "
                f"{interval(row['prefetch_precision'], 4)} |"
            )
    return lines


def frontier_table(experiment: dict, regime: str, concurrency: int) -> list[str]:
    lines = [
        "| alpha | prefetches issued | extra origin requests | prefetch precision | p95 ms | p99 ms |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    rows = [
        row
        for row in experiment["alpha_frontier_test"]
        if row["regime"] == regime and row["origin_concurrency"] == concurrency
    ]
    for row in sorted(rows, key=lambda item: item["alpha"]):
        lines.append(
            f"| {row['alpha']} | {interval(row['prefetch_issued'], 0)} | "
            f"{interval(row['extra_origin_requests_fraction'], 4)} | "
            f"{interval(row['prefetch_precision'], 4)} | "
            f"{interval(row['latency_ms_p95'])} | {interval(row['latency_ms_p99'])} |"
        )
    return lines


def headline(dataset: dict, nasa: dict, msnbc: dict, experiment: dict) -> dict:
    return {
        "dataset": {
            "nasa_july_raw_lines": dataset["parse"]["july_raw_lines"],
            "nasa_august_raw_lines": dataset["parse"]["august_raw_lines"],
            "nasa_parse_drop_reasons_july": dataset["parse"]["july"]["drop_reasons"],
            "nasa_parse_drop_reasons_august": dataset["parse"]["august"]["drop_reasons"],
            "page_like_requests_july": dataset["filters"]["july"]["page_like_after_asset_filter"],
            "page_like_requests_august": dataset["filters"]["august"]["page_like_after_asset_filter"],
            "asset_fraction_removed_july": dataset["filters"]["july"]["asset_fraction_of_successful"],
            "asset_fraction_removed_august": dataset["filters"]["august"]["asset_fraction_of_successful"],
            "sessions": {split: dataset["splits"][split]["sessions"] for split in dataset["splits"]},
            "session_length_median": dataset["splits"]["train"]["session_length_median"],
            "session_length_p95": dataset["splits"]["train"]["session_length_p95"],
            "think_time_median_seconds": dataset["splits"]["train"]["think_time_median_seconds"],
            "vocabulary_k": dataset["vocabulary"]["chosen_k"],
            "vocabulary_coverage": dataset["vocabulary"]["chosen_k_coverage"],
            "sessions_dropped_straddling_boundary": dataset["sessionization"][
                "sessions_dropped_straddling_july_august_boundary"
            ],
        },
        "predictor_nasa_test": {
            model: {
                key: nasa["test"][model][key]
                for key in (
                    "top1_accuracy",
                    "top3_accuracy",
                    "top5_accuracy",
                    "cross_entropy_nats",
                    "expected_calibration_error",
                    "non_terminal_top1_accuracy",
                )
            }
            for model in PREDICTOR_MODEL_ORDER
        },
        "predictor_msnbc_test": {
            model: {
                key: msnbc["test"][model][key]
                for key in (
                    "top1_accuracy",
                    "top3_accuracy",
                    "top5_accuracy",
                    "cross_entropy_nats",
                    "expected_calibration_error",
                )
            }
            for model in PREDICTOR_MODEL_ORDER
        },
        "model_cost": {
            "parameter_count": nasa["parameter_count"],
            "training_seconds": nasa["training"]["training_seconds"],
            "single_example_inference_microseconds_median": nasa["inference_latency"][
                "device_resident_microseconds_median"
            ],
            "single_example_inference_microseconds_p95": nasa["inference_latency"][
                "device_resident_microseconds_p95"
            ],
        },
        "simulator": {
            "service_model": experiment["config"]["service_model"],
            "gate_costs": experiment["config"]["gate_costs"],
            "alpha_selection": experiment["alpha_selection"],
        },
        "strategies": experiment["main"],
        "paired_vs_no_prefetch": experiment["paired_vs_no_prefetch"],
        "matched_load_comparison": experiment["matched_load_comparison"],
    }


def main() -> None:
    dataset = read("dataset_stats.json")
    nasa = read("predictor_nasa.json")
    msnbc = read("predictor_msnbc.json")
    experiment = read("experiment.json")

    summary = headline(dataset, nasa, msnbc, experiment)
    with open(os.path.join(RESULTS_DIR, "headline.json"), "w") as handle:
        json.dump(summary, handle, indent=2)

    sections = ["## NASA August 1995 test set: next-request prediction", ""]
    sections += predictor_table(nasa)
    sections += ["", "## MSNBC 1999 held-out sequences: next-category prediction", ""]
    sections += predictor_table(msnbc)
    for regime in ("small_cache", "warm_cache"):
        sections += ["", f"## Gateway simulation, {regime}", ""]
        sections += strategy_table(experiment, regime)
    for regime in ("small_cache", "warm_cache"):
        for concurrency in experiment["config"]["concurrency_levels"]:
            sections += ["", f"## Alpha frontier, {regime}, origin concurrency {concurrency}", ""]
            sections += frontier_table(experiment, regime, concurrency)

    text = "\n".join(sections)
    with open(os.path.join(RESULTS_DIR, "tables.md"), "w") as handle:
        handle.write(text + "\n")
    print(text)


if __name__ == "__main__":
    main()
