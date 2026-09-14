import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(ROOT, "results")

STRATEGY_ORDER = (
    "none",
    "always_top1",
    "always_top2",
    "markov1_top2",
    "static_rule",
    "cost_aware_mlp",
)

STRATEGY_LABELS = {
    "none": "no prefetch",
    "always_top1": "always top-1",
    "always_top2": "always top-2",
    "markov1_top2": "Markov top-2",
    "static_rule": "static rule",
    "cost_aware_mlp": "cost-aware (JAX)",
}

MODEL_LABELS = (
    ("most_frequent", "most frequent"),
    ("markov_order1", "Markov order 1"),
    ("markov_order2_backoff", "Markov order 2 + back-off"),
    ("jax_mlp", "JAX MLP"),
)


def load(name):
    with open(os.path.join(RESULTS, name), encoding="utf-8") as handle:
        return json.load(handle)


def cell(rows, regime, concurrency, strategy):
    for row in rows:
        if (
            row["regime"] == regime
            and row["origin_concurrency"] == concurrency
            and row["strategy"] == strategy
        ):
            return row
    raise KeyError((regime, concurrency, strategy))


def relative_delta(rows, regime, concurrency, strategy):
    treatment = cell(rows, regime, concurrency, strategy)["latency_ms_p95"]["mean"]
    control = cell(rows, regime, concurrency, "none")["latency_ms_p95"]["mean"]
    return (treatment - control) / control


def strategy_table(rows, regime, concurrency):
    lines = [
        "| strategy | p95 (ms) | delta p95 | extra origin load |",
        "| --- | ---: | ---: | ---: |",
    ]
    for strategy in STRATEGY_ORDER:
        row = cell(rows, regime, concurrency, strategy)
        p95 = row["latency_ms_p95"]["mean"]
        label = STRATEGY_LABELS[strategy]
        if strategy == "none":
            lines.append(f"| {label} | {p95:.1f} | baseline | baseline |")
            continue
        load = row["extra_origin_requests_fraction"]["mean"]
        change = relative_delta(rows, regime, concurrency, strategy)
        lines.append(f"| {label} | {p95:.1f} | {change * 100:+.1f}% | {load * 100:+.1f}% |")
    return "\n".join(lines)


def model_table(predictor):
    lines = [
        "| model | top-1 | top-3 | cross-entropy (nats) | ECE |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for key, label in MODEL_LABELS:
        row = predictor["test"][key]
        lines.append(
            f"| {label} | {row['top1_accuracy'] * 100:.1f}% | {row['top3_accuracy'] * 100:.1f}% | "
            f"{row['cross_entropy_nats']:.3f} | {row['expected_calibration_error']:.4f} |"
        )
    return "\n".join(lines)


def build() -> str:
    stats = load("dataset_stats.json")
    predictor = load("predictor_nasa.json")
    edge = load("experiment_edge.json")
    rows = edge["main"]
    origin_ms = edge["config"]["origin_base_milliseconds"]

    return f"""# jax-prefetch

Cost-aware predictive prefetching, measured on a real HTTP trace.

A prefetch is a bet. It spends origin capacity now to save latency later, and it is usually wrong.
This project trains a next-request predictor in JAX, prices each candidate prefetch against live
queue depth, and measures whether pricing the bet beats issuing it unconditionally.

Every number below is produced by the scripts in this repository and written to `results/`.

## Result

Origin {origin_ms:.0f} ms away (the `edge` profile), mean over 7 test seeds. The gate margin `alpha`
is selected on 5 disjoint validation seeds and never on the test seeds reported here.

Origin provisioned, 1024-entry cache and 64 workers:

{strategy_table(rows, "edge_warm", 64)}

Origin saturated, 256-entry cache and 16 workers:

{strategy_table(rows, "edge_small", 16)}

Same predictor and same predictions in both tables. The only difference is whether each bet is priced
before it is placed. Backend cost in the gate scales with `1 + queue_depth / concurrency`, so under
saturation no candidate probability clears the threshold and the policy stops issuing.

## Predictor

August test set, {predictor['split_sizes']['test']:,} decision points, fit on July only.

{model_table(predictor)}

The MLP's advantage over a second-order Markov chain sits in likelihood and calibration rather than
top-1 accuracy. That is the property the gate needs, since it consumes a probability rather than an
argmax.

## Data

Real traffic rather than synthetic. `scripts/run_all.sh` expects these files in `data/`:

- `NASA_access_log_Jul95.gz` and `NASA_access_log_Aug95.gz` from the Internet Traffic Archive
  (https://ita.ee.lbl.gov/html/contrib/NASA-HTTP.html), {stats['parse']['july_raw_lines']:,} and
  {stats['parse']['august_raw_lines']:,} raw lines respectively.
- `msnbc990928.seq.gz` from the UCI Machine Learning Repository, used as a second-domain check.

Sessions use a 30-minute inactivity timeout.
{stats['sessionization']['sessions_dropped_straddling_july_august_boundary']} sessions straddling the
July/August boundary are dropped rather than split, and the path vocabulary is built from the
training period only.

## Reproducing

    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    bash scripts/run_all.sh                          # datacenter profile
    PREFETCH_PROFILE=edge bash scripts/run_all.sh    # edge profile
    .venv/bin/python -m src.eval.regime_sweep        # cache capacity sweep
    .venv/bin/python -m src.eval.latency_sweep       # origin distance sweep

Set `VENV` to place the virtualenv outside the source tree, which matters on shared filesystems.

## What this does not show

- The origin is simulated. Only the workload is real. Service time is response size plus lognormal
  jitter through a fixed-concurrency queue. Real origins have their own caches, correlated failures,
  and per-endpoint costs that are nothing like linear in bytes.
- A 1995 trace has short sessions (median 2 requests) and long think times (median
  {stats['splits']['test']['think_time_median_seconds']:.0f} seconds). The structure of the problem
  carries over to modern traffic. The absolute latencies do not.
- `src/eval/latency_sweep.py` selects `alpha` per cell on the same seeds it reports. Treat its trend
  as the finding and its magnitudes as optimistic. The two profile experiments use a held-out split.
- A single-example forward pass costs
  {predictor['inference_latency']['with_host_transfer_microseconds_median']:.0f} microseconds on CPU,
  most of it dispatch overhead. On a synchronous request path that is not free.
"""


def main() -> None:
    with open(os.path.join(ROOT, "README.md"), "w", encoding="utf-8") as handle:
        handle.write(build())
    print("wrote README.md")


if __name__ == "__main__":
    main()
