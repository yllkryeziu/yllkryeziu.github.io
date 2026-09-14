import json
import os
import time

from src.data.prepare import RESULTS_DIR
from src.eval.experiment import (
    CacheRegime,
    WindowCache,
    derive_gate_costs,
    run_single,
)
from src.eval.stats import mean_with_confidence_interval, paired_difference
from src.sim.service import ServiceModel
from src.sim.workload import load_workload

SEEDS = (11, 12, 13, 14, 15)
ORIGIN_BASE_MILLISECONDS = (20.0, 60.0, 150.0, 400.0)
ORIGIN_CONCURRENCY = (16, 64, 256)
CACHE_CAPACITIES = (256, 1024)
TIME_SCALES = (1200.0, 2400.0)
ALPHAS = (0.02, 0.07, 0.22)
STRATEGIES = ("none", "always_top1", "cost_aware_mlp")
CACHE_TTL_SECONDS = 300.0
BYTES_PER_MILLISECOND = 1000.0
JITTER_SIGMA = 0.35
CACHE_HIT_MILLISECONDS = 1.0


def service_model_for(base_milliseconds: float) -> ServiceModel:
    return ServiceModel(
        base_milliseconds=base_milliseconds,
        bytes_per_millisecond=BYTES_PER_MILLISECOND,
        jitter_sigma=JITTER_SIGMA,
        cache_hit_milliseconds=CACHE_HIT_MILLISECONDS,
    )


def sweep() -> dict:
    started = time.perf_counter()
    workload = load_workload("test")
    windows = WindowCache(workload)

    runs = []
    for base_milliseconds in ORIGIN_BASE_MILLISECONDS:
        service_model = service_model_for(base_milliseconds)
        gate_costs = derive_gate_costs(workload, service_model)
        for capacity in CACHE_CAPACITIES:
            regime = CacheRegime(f"cap{capacity}", capacity, CACHE_TTL_SECONDS)
            for time_scale in TIME_SCALES:
                for concurrency in ORIGIN_CONCURRENCY:
                    for strategy in STRATEGIES:
                        alphas = ALPHAS if strategy == "cost_aware_mlp" else (0.0,)
                        for alpha in alphas:
                            for seed in SEEDS:
                                run = run_single(
                                    workload, windows, service_model, gate_costs, regime,
                                    concurrency, strategy, alpha, seed, time_scale,
                                )
                                run["origin_base_milliseconds"] = base_milliseconds
                                runs.append(run)

    keyed: dict[tuple, list[dict]] = {}
    for run in runs:
        key = (
            run["origin_base_milliseconds"],
            run["cache_capacity_entries"],
            run["time_scale"],
            run["origin_concurrency"],
        )
        keyed.setdefault(key, []).append(run)

    rows = []
    for key in sorted(keyed):
        base_milliseconds, capacity, time_scale, concurrency = key
        group = keyed[key]
        control = sorted(
            [run for run in group if run["strategy"] == "none"], key=lambda run: run["seed"]
        )

        def summarise(subset: list[dict]) -> dict:
            ordered = sorted(subset, key=lambda run: run["seed"])
            return {
                "p95_ms": mean_with_confidence_interval(
                    [run["latency_ms_p95"] for run in ordered]),
                "delta_p95_ms": paired_difference(
                    [run["latency_ms_p95"] for run in ordered],
                    [run["latency_ms_p95"] for run in control]),
                "cache_hit_rate": mean_with_confidence_interval(
                    [run["cache_hit_rate"] for run in ordered]),
                "prefetch_precision": mean_with_confidence_interval(
                    [run["prefetch_precision"] for run in ordered]),
                "extra_origin_requests_fraction": mean_with_confidence_interval(
                    [run["origin_requests_total"] / control[i]["origin_requests_total"] - 1.0
                     for i, run in enumerate(ordered)]),
            }

        naive = summarise([run for run in group if run["strategy"] == "always_top1"])
        by_alpha = {}
        for alpha in ALPHAS:
            subset = [
                run for run in group
                if run["strategy"] == "cost_aware_mlp" and run["alpha"] == alpha
            ]
            if subset:
                by_alpha[alpha] = summarise(subset)
        best_alpha = min(by_alpha, key=lambda alpha: by_alpha[alpha]["p95_ms"]["mean"])

        rows.append({
            "origin_base_milliseconds": base_milliseconds,
            "cache_capacity_entries": capacity,
            "time_scale": time_scale,
            "origin_concurrency": concurrency,
            "baseline_p95_ms": mean_with_confidence_interval(
                [run["latency_ms_p95"] for run in control]),
            "baseline_cache_hit_rate": mean_with_confidence_interval(
                [run["cache_hit_rate"] for run in control]),
            "always_top1": naive,
            "cost_aware_best_alpha": best_alpha,
            "cost_aware": by_alpha[best_alpha],
            "cost_aware_by_alpha": {str(alpha): row for alpha, row in by_alpha.items()},
        })

    return {
        "config": {
            "seeds": list(SEEDS),
            "origin_base_milliseconds": list(ORIGIN_BASE_MILLISECONDS),
            "origin_concurrency": list(ORIGIN_CONCURRENCY),
            "cache_capacities": list(CACHE_CAPACITIES),
            "time_scales": list(TIME_SCALES),
            "alphas": list(ALPHAS),
            "cache_ttl_seconds": CACHE_TTL_SECONDS,
            "alpha_selected_per_cell_on_test_seeds": True,
        },
        "rows": rows,
        "total_runs": len(runs),
        "wall_clock_seconds": time.perf_counter() - started,
    }


def main() -> None:
    report = sweep()
    os.makedirs(RESULTS_DIR, exist_ok=True)
    with open(os.path.join(RESULTS_DIR, "latency_sweep.json"), "w") as handle:
        json.dump(report, handle, indent=2)
    wins = [
        row for row in report["rows"]
        if row["cost_aware"]["delta_p95_ms"]["ci_high"] < 0.0
    ]
    print(f"runs={report['total_runs']} seconds={report['wall_clock_seconds']:.1f} "
          f"significant_wins={len(wins)}/{len(report['rows'])}")


if __name__ == "__main__":
    main()
