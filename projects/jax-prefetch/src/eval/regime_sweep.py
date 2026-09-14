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
from src.sim.service import DEFAULT_SERVICE_MODEL
from src.sim.workload import load_workload

SEEDS = (11, 12, 13, 14, 15)
CACHE_CAPACITIES = (32, 256, 1024, 4096)
CACHE_TTLS = (30.0, 300.0, 1800.0)
TIME_SCALES = (600.0, 1200.0, 2400.0)
CONCURRENCY_LEVELS = (4, 16)
STRATEGIES = ("none", "always_top1", "cost_aware_mlp")
ALPHA = 0.07


def sweep() -> dict:
    started = time.perf_counter()
    service_model = DEFAULT_SERVICE_MODEL
    workload = load_workload("test")
    gate_costs = derive_gate_costs(workload, service_model)
    windows = WindowCache(workload)

    runs = []
    for capacity in CACHE_CAPACITIES:
        for ttl in CACHE_TTLS:
            regime = CacheRegime(f"cap{capacity}_ttl{int(ttl)}", capacity, ttl)
            for time_scale in TIME_SCALES:
                for concurrency in CONCURRENCY_LEVELS:
                    for strategy in STRATEGIES:
                        for seed in SEEDS:
                            runs.append(
                                run_single(
                                    workload, windows, service_model, gate_costs, regime,
                                    concurrency, strategy, ALPHA, seed, time_scale,
                                )
                            )

    keyed: dict[tuple, dict[str, list[dict]]] = {}
    for run in runs:
        key = (run["cache_capacity_entries"], run["cache_ttl_seconds"],
               run["time_scale"], run["origin_concurrency"])
        keyed.setdefault(key, {}).setdefault(run["strategy"], []).append(run)

    rows = []
    for key in sorted(keyed):
        capacity, ttl, time_scale, concurrency = key
        by_strategy = keyed[key]
        control = sorted(by_strategy["none"], key=lambda run: run["seed"])
        row = {
            "cache_capacity_entries": capacity,
            "cache_ttl_seconds": ttl,
            "time_scale": time_scale,
            "origin_concurrency": concurrency,
            "baseline_p95_ms": mean_with_confidence_interval(
                [run["latency_ms_p95"] for run in control]),
            "baseline_cache_hit_rate": mean_with_confidence_interval(
                [run["cache_hit_rate"] for run in control]),
            "strategies": {},
        }
        for strategy, strategy_runs in by_strategy.items():
            if strategy == "none":
                continue
            treatment = sorted(strategy_runs, key=lambda run: run["seed"])
            row["strategies"][strategy] = {
                "p95_ms": mean_with_confidence_interval(
                    [run["latency_ms_p95"] for run in treatment]),
                "delta_p95_ms": paired_difference(
                    [run["latency_ms_p95"] for run in treatment],
                    [run["latency_ms_p95"] for run in control]),
                "cache_hit_rate": mean_with_confidence_interval(
                    [run["cache_hit_rate"] for run in treatment]),
                "prefetch_precision": mean_with_confidence_interval(
                    [run["prefetch_precision"] for run in treatment]),
                "extra_origin_requests_fraction": mean_with_confidence_interval(
                    [run["origin_requests_total"] / control[i]["origin_requests_total"] - 1.0
                     for i, run in enumerate(treatment)]),
            }
        rows.append(row)

    return {
        "config": {
            "seeds": list(SEEDS),
            "cache_capacities": list(CACHE_CAPACITIES),
            "cache_ttls": list(CACHE_TTLS),
            "time_scales": list(TIME_SCALES),
            "concurrency_levels": list(CONCURRENCY_LEVELS),
            "strategies": list(STRATEGIES),
            "alpha": ALPHA,
        },
        "rows": rows,
        "total_runs": len(runs),
        "wall_clock_seconds": time.perf_counter() - started,
    }


def main() -> None:
    report = sweep()
    os.makedirs(RESULTS_DIR, exist_ok=True)
    with open(os.path.join(RESULTS_DIR, "regime_sweep.json"), "w") as handle:
        json.dump(report, handle, indent=2)
    wins = [
        row for row in report["rows"]
        if row["strategies"]["cost_aware_mlp"]["delta_p95_ms"]["ci_high"] < 0.0
    ]
    print(f"runs={report['total_runs']} seconds={report['wall_clock_seconds']:.1f} "
          f"significant_wins={len(wins)}/{len(report['rows'])}")


if __name__ == "__main__":
    main()
