import json
import os
import time
from dataclasses import asdict, dataclass, replace

import numpy as np

from src.data.prepare import RESULTS_DIR
from src.eval.stats import mean_with_confidence_interval, paired_difference
from src.model.run_predictor import environment_provenance
from src.policy.gate import (
    CostAwarePolicy,
    GateConfig,
    NoPrefetchPolicy,
    StaticRulePolicy,
    TopKPolicy,
)
from src.sim.gateway import Gateway, GatewayConfig
from src.sim.service import DEFAULT_SERVICE_MODEL, ServiceModel
from src.sim.workload import Workload, load_workload, sample_window

PROFILE = os.environ.get("PREFETCH_PROFILE", "datacenter")

TEST_SEEDS = (11, 12, 13, 14, 15, 16, 17)
VALIDATION_SEEDS = (101, 102, 103, 104, 105)
WINDOW_HOURS = 72.0
TIME_SCALE = 2400.0
CONCURRENCY_LEVELS = (16, 64, 256) if PROFILE == "edge" else (4, 8, 16)
ALPHA_SWEEP = (0.005, 0.01, 0.02, 0.04, 0.07, 0.1, 0.15, 0.22, 0.32, 0.5, 1.0)
FALLBACK_ALPHA = 0.1
EXTRA_ORIGIN_BUDGET = 0.20
SESSION_BUDGET = 8
PROBABILITY_FLOOR = 0.05
STATIC_RULE_THRESHOLD = 0.25
LOAD_VALIDATION_TIME_SCALES = (600.0, 1200.0, 2400.0, 3600.0, 4800.0)

STRATEGIES = (
    "none",
    "always_top1",
    "always_top2",
    "markov1_top2",
    "static_rule",
    "cost_aware_mlp",
)

REPORTED_METRICS = (
    "latency_ms_p50",
    "latency_ms_p95",
    "latency_ms_p99",
    "latency_ms_mean",
    "cache_hit_rate",
    "origin_requests_total",
    "origin_requests_prefetch",
    "prefetch_issued",
    "prefetch_precision",
    "wasted_prefetch_fraction",
    "extra_origin_requests_fraction",
    "inflight_attach_rate",
    "requests_served",
)


@dataclass(frozen=True)
class CacheRegime:
    name: str
    capacity_entries: int
    ttl_seconds: float


CACHE_REGIMES = (
    (
        CacheRegime("edge_small", 256, 300.0),
        CacheRegime("edge_warm", 1024, 300.0),
    )
    if PROFILE == "edge"
    else (
        CacheRegime("small_cache", 32, 30.0),
        CacheRegime("warm_cache", 256, 300.0),
    )
)

ORIGIN_BASE_MILLISECONDS = 150.0 if PROFILE == "edge" else 20.0


def derive_gate_costs(workload: Workload, service_model: ServiceModel) -> dict:
    cacheable_bytes = workload.predicted_bytes[workload.cacheable]
    mean_bytes = float(cacheable_bytes.mean())
    median_bytes = float(np.median(cacheable_bytes))
    return {
        "waste_penalty_milliseconds": service_model.expected_milliseconds(mean_bytes),
        "cache_pressure_milliseconds": service_model.expected_milliseconds(median_bytes),
        "source_mean_bytes": mean_bytes,
        "source_median_bytes": median_bytes,
        "source": "july_training_split_median_response_bytes_per_cacheable_path",
    }


def build_policy(
    name: str, workload: Workload, service_model: ServiceModel, gate_costs: dict, alpha: float
):
    if name == "none":
        return NoPrefetchPolicy()
    if name in ("always_top1", "always_top2"):
        return TopKPolicy(
            name,
            1 if name == "always_top1" else 2,
            workload.mlp_top_ids,
            workload.mlp_top_probabilities,
            workload.vocab_to_path,
            workload.cacheable,
            SESSION_BUDGET,
        )
    if name == "markov1_top2":
        return TopKPolicy(
            name,
            2,
            workload.markov1_top_ids,
            workload.markov1_top_probabilities,
            workload.vocab_to_path,
            workload.cacheable,
            SESSION_BUDGET,
        )
    if name == "static_rule":
        return StaticRulePolicy(
            workload.current_vocab,
            workload.markov1_table,
            workload.vocab_to_path,
            workload.cacheable,
            STATIC_RULE_THRESHOLD,
            SESSION_BUDGET,
        )
    if name == "cost_aware_mlp":
        config = GateConfig(
            alpha=alpha,
            probability_floor=PROBABILITY_FLOOR,
            session_budget=SESSION_BUDGET,
            waste_penalty_milliseconds=gate_costs["waste_penalty_milliseconds"],
            cache_pressure_milliseconds=gate_costs["cache_pressure_milliseconds"],
            max_candidates_per_decision=2,
        )
        return CostAwarePolicy(
            workload.mlp_top_ids,
            workload.mlp_top_probabilities,
            workload.vocab_to_path,
            workload.cacheable,
            workload.predicted_bytes,
            service_model,
            config,
        )
    raise ValueError(name)


class WindowCache:
    def __init__(self, workload: Workload) -> None:
        self.workload = workload
        self.windows: dict[tuple[int, float], object] = {}

    def get(self, seed: int, time_scale: float):
        key = (seed, time_scale)
        if key not in self.windows:
            self.windows[key] = sample_window(self.workload, seed, WINDOW_HOURS, time_scale)
        return self.windows[key]


def run_single(
    workload: Workload,
    windows: WindowCache,
    service_model: ServiceModel,
    gate_costs: dict,
    regime: CacheRegime,
    concurrency: int,
    strategy: str,
    alpha: float,
    seed: int,
    time_scale: float,
) -> dict:
    window = windows.get(seed, time_scale)
    policy = build_policy(strategy, workload, service_model, gate_costs, alpha)
    config = GatewayConfig(
        origin_concurrency=concurrency,
        cache_capacity_entries=regime.capacity_entries,
        cache_ttl_seconds=regime.ttl_seconds,
        time_scale=time_scale,
    )
    summary = Gateway(workload, window, policy, service_model, config, seed).run()
    summary.update(
        {
            "split": workload.calibration["split"],
            "regime": regime.name,
            "cache_capacity_entries": regime.capacity_entries,
            "cache_ttl_seconds": regime.ttl_seconds,
            "origin_concurrency": concurrency,
            "strategy": strategy,
            "alpha": alpha if strategy == "cost_aware_mlp" else None,
            "seed": seed,
            "time_scale": time_scale,
            "window_hours": WINDOW_HOURS,
            "policy": policy.describe(),
        }
    )
    return summary


def attach_extra_origin(runs: list[dict], baseline_runs: list[dict]) -> None:
    baseline = {
        (run["regime"], run["origin_concurrency"], run["seed"]): run["origin_requests_total"]
        for run in baseline_runs
        if run["strategy"] == "none"
    }
    for run in runs:
        reference = baseline.get((run["regime"], run["origin_concurrency"], run["seed"]))
        run["extra_origin_requests_fraction"] = (
            run["origin_requests_total"] / reference - 1.0 if reference else None
        )


def aggregate(runs: list[dict], group_keys: tuple[str, ...]) -> list[dict]:
    groups: dict[tuple, list[dict]] = {}
    for run in runs:
        groups.setdefault(tuple(run[key] for key in group_keys), []).append(run)
    rows = []
    for key, members in sorted(groups.items(), key=lambda item: str(item[0])):
        row = dict(zip(group_keys, key))
        row["seeds"] = sorted(member["seed"] for member in members)
        for metric in REPORTED_METRICS:
            values = [member.get(metric) for member in members]
            row[metric] = mean_with_confidence_interval(
                [float(value) for value in values if value is not None]
            )
        rows.append(row)
    return rows


def paired_comparisons(runs: list[dict]) -> list[dict]:
    indexed: dict[tuple, dict[int, dict]] = {}
    for run in runs:
        key = (run["regime"], run["origin_concurrency"], run["strategy"])
        indexed.setdefault(key, {})[run["seed"]] = run
    comparisons = []
    for regime in CACHE_REGIMES:
        for concurrency in CONCURRENCY_LEVELS:
            control = indexed.get((regime.name, concurrency, "none"), {})
            for strategy in STRATEGIES:
                if strategy == "none":
                    continue
                treatment = indexed.get((regime.name, concurrency, strategy), {})
                shared = sorted(set(control) & set(treatment))
                if not shared:
                    continue
                row = {
                    "regime": regime.name,
                    "origin_concurrency": concurrency,
                    "strategy": strategy,
                    "seeds": shared,
                }
                for metric in (
                    "latency_ms_p50",
                    "latency_ms_p95",
                    "latency_ms_p99",
                    "latency_ms_mean",
                ):
                    row[f"delta_{metric}"] = paired_difference(
                        [treatment[seed][metric] for seed in shared],
                        [control[seed][metric] for seed in shared],
                    )
                comparisons.append(row)
    return comparisons


def sweep_alpha(
    workload: Workload,
    windows: WindowCache,
    service_model: ServiceModel,
    gate_costs: dict,
    seeds: tuple[int, ...],
) -> list[dict]:
    runs = []
    for regime in CACHE_REGIMES:
        for concurrency in CONCURRENCY_LEVELS:
            for seed in seeds:
                runs.append(
                    run_single(
                        workload, windows, service_model, gate_costs, regime, concurrency,
                        "none", FALLBACK_ALPHA, seed, TIME_SCALE,
                    )
                )
            for alpha in ALPHA_SWEEP:
                for seed in seeds:
                    runs.append(
                        run_single(
                            workload, windows, service_model, gate_costs, regime, concurrency,
                            "cost_aware_mlp", alpha, seed, TIME_SCALE,
                        )
                    )
    attach_extra_origin(runs, runs)
    return runs


def select_alpha(validation_runs: list[dict]) -> dict:
    rows = aggregate(
        [run for run in validation_runs if run["strategy"] == "cost_aware_mlp"],
        ("regime", "origin_concurrency", "alpha"),
    )
    selection = {}
    detail = []
    for regime in CACHE_REGIMES:
        for concurrency in CONCURRENCY_LEVELS:
            candidates = [
                row
                for row in rows
                if row["regime"] == regime.name and row["origin_concurrency"] == concurrency
            ]
            affordable = [
                row
                for row in candidates
                if row["extra_origin_requests_fraction"]["mean"] <= EXTRA_ORIGIN_BUDGET
            ]
            pool = affordable if affordable else candidates
            best = min(pool, key=lambda row: row["latency_ms_p95"]["mean"])
            selection[(regime.name, concurrency)] = best["alpha"]
            detail.append(
                {
                    "regime": regime.name,
                    "origin_concurrency": concurrency,
                    "selected_alpha": best["alpha"],
                    "selection_rule": "min_validation_p95_latency_subject_to_extra_origin_budget",
                    "extra_origin_budget": EXTRA_ORIGIN_BUDGET,
                    "validation_p95_ms": best["latency_ms_p95"],
                    "validation_extra_origin_fraction": best["extra_origin_requests_fraction"],
                    "candidates_within_budget": len(affordable),
                }
            )
    return {"selection": selection, "detail": detail}


def matched_load_comparison(test_alpha_rows: list[dict], main_rows: list[dict]) -> list[dict]:
    comparisons = []
    for regime in CACHE_REGIMES:
        for concurrency in CONCURRENCY_LEVELS:
            for reference_strategy in ("always_top1", "always_top2", "markov1_top2", "static_rule"):
                reference = next(
                    (
                        row
                        for row in main_rows
                        if row["regime"] == regime.name
                        and row["origin_concurrency"] == concurrency
                        and row["strategy"] == reference_strategy
                    ),
                    None,
                )
                if reference is None:
                    continue
                target = reference["extra_origin_requests_fraction"]["mean"]
                candidates = [
                    row
                    for row in test_alpha_rows
                    if row["regime"] == regime.name and row["origin_concurrency"] == concurrency
                ]
                closest = min(
                    candidates,
                    key=lambda row: abs(row["extra_origin_requests_fraction"]["mean"] - target),
                )
                comparisons.append(
                    {
                        "regime": regime.name,
                        "origin_concurrency": concurrency,
                        "reference_strategy": reference_strategy,
                        "reference_extra_origin_fraction": reference["extra_origin_requests_fraction"],
                        "reference_p95_ms": reference["latency_ms_p95"],
                        "reference_prefetch_precision": reference["prefetch_precision"],
                        "matched_alpha": closest["alpha"],
                        "matched_extra_origin_fraction": closest["extra_origin_requests_fraction"],
                        "matched_p95_ms": closest["latency_ms_p95"],
                        "matched_prefetch_precision": closest["prefetch_precision"],
                    }
                )
    return comparisons


def load_response_validation(
    workload: Workload, windows: WindowCache, service_model: ServiceModel, gate_costs: dict
) -> list[dict]:
    rows = []
    for regime in CACHE_REGIMES:
        for time_scale in LOAD_VALIDATION_TIME_SCALES:
            for concurrency in CONCURRENCY_LEVELS:
                runs = [
                    run_single(
                        workload, windows, service_model, gate_costs, regime, concurrency,
                        "none", FALLBACK_ALPHA, seed, time_scale,
                    )
                    for seed in TEST_SEEDS
                ]
                row = {
                    "regime": regime.name,
                    "time_scale": time_scale,
                    "origin_concurrency": concurrency,
                    "seeds": list(TEST_SEEDS),
                }
                for metric in (
                    "latency_ms_p50",
                    "latency_ms_p95",
                    "latency_ms_p99",
                    "cache_hit_rate",
                    "offered_requests_per_second",
                    "mean_origin_queue_length_at_submit",
                ):
                    row[metric] = mean_with_confidence_interval([run[metric] for run in runs])
                row["origin_requests_per_second"] = mean_with_confidence_interval(
                    [run["origin_requests_total"] / run["simulated_span_seconds"] for run in runs]
                )
                rows.append(row)
    return rows


def main() -> None:
    started = time.perf_counter()
    service_model = replace(DEFAULT_SERVICE_MODEL, base_milliseconds=ORIGIN_BASE_MILLISECONDS)

    test_workload = load_workload("test")
    validation_workload = load_workload("val")
    gate_costs = derive_gate_costs(test_workload, service_model)
    test_windows = WindowCache(test_workload)
    validation_windows = WindowCache(validation_workload)

    load_rows = load_response_validation(test_workload, test_windows, service_model, gate_costs)

    validation_runs = sweep_alpha(
        validation_workload, validation_windows, service_model, gate_costs, VALIDATION_SEEDS
    )
    chosen = select_alpha(validation_runs)

    main_runs = []
    for regime in CACHE_REGIMES:
        for concurrency in CONCURRENCY_LEVELS:
            alpha = chosen["selection"][(regime.name, concurrency)]
            for strategy in STRATEGIES:
                for seed in TEST_SEEDS:
                    main_runs.append(
                        run_single(
                            test_workload, test_windows, service_model, gate_costs, regime,
                            concurrency, strategy, alpha, seed, TIME_SCALE,
                        )
                    )
    attach_extra_origin(main_runs, main_runs)

    test_alpha_runs = sweep_alpha(
        test_workload, test_windows, service_model, gate_costs, TEST_SEEDS
    )
    test_alpha_rows = aggregate(
        [run for run in test_alpha_runs if run["strategy"] == "cost_aware_mlp"],
        ("regime", "origin_concurrency", "alpha"),
    )
    main_rows = aggregate(main_runs, ("regime", "origin_concurrency", "strategy"))

    report = {
        "environment": environment_provenance(),
        "config": {
            "profile": PROFILE,
            "origin_base_milliseconds": ORIGIN_BASE_MILLISECONDS,
            "test_seeds": list(TEST_SEEDS),
            "validation_seeds": list(VALIDATION_SEEDS),
            "window_hours": WINDOW_HOURS,
            "time_scale": TIME_SCALE,
            "concurrency_levels": list(CONCURRENCY_LEVELS),
            "alpha_sweep": list(ALPHA_SWEEP),
            "extra_origin_budget_for_alpha_selection": EXTRA_ORIGIN_BUDGET,
            "session_budget": SESSION_BUDGET,
            "probability_floor": PROBABILITY_FLOOR,
            "static_rule_threshold": STATIC_RULE_THRESHOLD,
            "cache_regimes": [asdict(regime) for regime in CACHE_REGIMES],
            "service_model": asdict(service_model),
            "gate_costs": gate_costs,
            "workload_calibration": test_workload.calibration,
            "load_validation_time_scales": list(LOAD_VALIDATION_TIME_SCALES),
        },
        "load_response_validation": load_rows,
        "alpha_selection": chosen["detail"],
        "main": main_rows,
        "paired_vs_no_prefetch": paired_comparisons(main_runs),
        "alpha_frontier_test": test_alpha_rows,
        "alpha_frontier_validation": aggregate(
            [run for run in validation_runs if run["strategy"] == "cost_aware_mlp"],
            ("regime", "origin_concurrency", "alpha"),
        ),
        "matched_load_comparison": matched_load_comparison(test_alpha_rows, main_rows),
        "wall_clock_seconds": None,
    }
    report["wall_clock_seconds"] = time.perf_counter() - started

    os.makedirs(RESULTS_DIR, exist_ok=True)
    suffix = "" if PROFILE == "datacenter" else f"_{PROFILE}"
    with open(os.path.join(RESULTS_DIR, f"experiment{suffix}.json"), "w") as handle:
        json.dump(report, handle, indent=2)
    with open(os.path.join(RESULTS_DIR, f"experiment_runs{suffix}.json"), "w") as handle:
        json.dump(
            {"main_runs": main_runs, "test_alpha_runs": test_alpha_runs, "validation_runs": validation_runs},
            handle,
            indent=2,
        )
    total = len(main_runs) + len(test_alpha_runs) + len(validation_runs)
    print(f"runs={total} seconds={report['wall_clock_seconds']:.1f}")


if __name__ == "__main__":
    main()
