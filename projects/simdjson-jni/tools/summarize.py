import argparse
import glob
import json
import math
import os
import re
from typing import Any, Dict, List, Optional

ENGINES = ["jackson-tree", "jackson-stream", "simdjson-jni-copy", "simdjson-jni-direct"]
LISTING_FIELDS = 8


def load(path: str) -> Any:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def load_optional(path: str) -> Optional[Any]:
    if not os.path.exists(path):
        return None
    return load(path)


def dataset_bytes(environment: Dict[str, Any]) -> Dict[str, int]:
    return {row["name"]: row["bytes"] for row in environment["datasets"]}


def param(record: Dict[str, Any], key: str) -> Optional[str]:
    return record.get("params", {}).get(key)


def primary(record: Dict[str, Any]) -> Dict[str, Any]:
    return record["primaryMetric"]


def as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number


def score_error(metric: Dict[str, Any]) -> Optional[float]:
    return as_float(metric.get("scoreError"))


def iteration_count(metric: Dict[str, Any]) -> int:
    raw = metric.get("rawData")
    if raw:
        return sum(len(fork) for fork in raw)
    return 0


def sample_count(metric: Dict[str, Any]) -> int:
    histogram = metric.get("rawDataHistogram")
    if not histogram:
        return 0
    total = 0
    for fork in histogram:
        for iteration in fork:
            for bucket in iteration:
                total += int(bucket[1])
    return total


def mb_per_second(ops_per_second: float, size_bytes: int) -> float:
    return ops_per_second * size_bytes / 1.0e6


def build_throughput(records: List[Dict[str, Any]], sizes: Dict[str, int]) -> Dict[str, Any]:
    per_dataset: Dict[str, Dict[str, Any]] = {}
    corpus_totals: Dict[str, Dict[str, float]] = {engine: {"bytes": 0.0, "seconds": 0.0}
                                                  for engine in ENGINES}

    for record in records:
        dataset = param(record, "dataset")
        engine = param(record, "engine")
        metric = primary(record)
        size = sizes[dataset]
        ops = metric["score"]
        error = score_error(metric)
        entry = {
            "ops_per_second": ops,
            "ops_per_second_error_99ci": error,
            "mb_per_second": mb_per_second(ops, size),
            "mb_per_second_error_99ci": None if error is None else mb_per_second(error, size),
            "mean_op_micros": 1.0e6 / ops,
            "measurement_iterations": iteration_count(metric),
        }
        per_dataset.setdefault(dataset, {"bytes": size, "engines": {}})
        per_dataset[dataset]["engines"][engine] = entry
        corpus_totals[engine]["bytes"] += size
        corpus_totals[engine]["seconds"] += 1.0 / ops

    aggregate = {}
    for engine, totals in corpus_totals.items():
        if totals["seconds"] == 0.0:
            continue
        aggregate[engine] = {
            "total_corpus_bytes": int(totals["bytes"]),
            "total_seconds_one_pass_each_file": totals["seconds"],
            "aggregate_mb_per_second": totals["bytes"] / totals["seconds"] / 1.0e6,
        }

    ordered = {}
    for dataset in sorted(per_dataset):
        engines = per_dataset[dataset]["engines"]
        best_jvm = max(
            (e for e in engines if e.startswith("jackson")),
            key=lambda e: engines[e]["mb_per_second"],
            default=None)
        speedups = {}
        if best_jvm is not None:
            base = engines[best_jvm]["mb_per_second"]
            for engine in engines:
                speedups[engine] = engines[engine]["mb_per_second"] / base
        ordered[dataset] = {
            "bytes": per_dataset[dataset]["bytes"],
            "engines": engines,
            "best_jvm_engine": best_jvm,
            "speedup_vs_best_jvm_engine": speedups,
        }

    return {
        "method": ("JMH Throughput mode, ops/s converted to MB/s as ops_per_second * "
                   "dataset_bytes / 1e6. Error bars are JMH 99.9% confidence half-widths "
                   "converted the same way."),
        "aggregate_method": ("Aggregate is total corpus bytes divided by the summed time of "
                             "one pass over each corpus file, i.e. a harmonic-style mean "
                             "weighted by file size, not an arithmetic mean of MB/s."),
        "per_dataset": ordered,
        "corpus_aggregate": aggregate,
    }


def build_latency(records: List[Dict[str, Any]], sizes: Dict[str, int],
                  environment: Dict[str, Any]) -> Dict[str, Any]:
    batch_name = "vehicles-latency-batch"
    engines = {}
    for record in records:
        engine = param(record, "engine")
        metric = primary(record)
        percentiles = metric.get("scorePercentiles", {})
        engines[engine] = {
            "mean_micros": metric["score"],
            "mean_micros_error_99ci": score_error(metric),
            "p50_micros": as_float(percentiles.get("50.0")),
            "p90_micros": as_float(percentiles.get("90.0")),
            "p99_micros": as_float(percentiles.get("99.0")),
            "p99_9_micros": as_float(percentiles.get("99.9")),
            "p100_max_micros": as_float(percentiles.get("100.0")),
            "sample_count": sample_count(metric),
        }
    return {
        "method": ("JMH SampleTime mode over one checksum pass of a fixed NDJSON batch of real "
                   "EPA vehicle records. Percentiles are JMH's own sample percentiles."),
        "workload": batch_name,
        "batch_records": environment["latency_batch_records"],
        "batch_bytes": sizes.get(batch_name),
        "engines": engines,
    }


def build_allocation(records: List[Dict[str, Any]], sizes: Dict[str, int]) -> Dict[str, Any]:
    per_dataset: Dict[str, Dict[str, Any]] = {}
    for record in records:
        dataset = param(record, "dataset")
        engine = param(record, "engine")
        secondary = record.get("secondaryMetrics", {})
        entry = {
            "alloc_bytes_per_op": metric_score(secondary, "gc.alloc.rate.norm"),
            "alloc_bytes_per_op_error_99ci": metric_error(secondary, "gc.alloc.rate.norm"),
            "alloc_rate_mb_per_second": metric_score(secondary, "gc.alloc.rate"),
            "gc_count": metric_score(secondary, "gc.count"),
            "gc_time_ms": metric_score(secondary, "gc.time"),
            "throughput_ops_per_second_under_profiler": primary(record)["score"],
        }
        size = sizes[dataset]
        if entry["alloc_bytes_per_op"] is not None:
            entry["alloc_bytes_per_input_byte"] = entry["alloc_bytes_per_op"] / size
        per_dataset.setdefault(dataset, {"bytes": size, "engines": {}})
        per_dataset[dataset]["engines"][engine] = entry
    return {
        "method": ("JMH -prof gc. gc.alloc.rate.norm is bytes allocated on the Java heap per "
                   "benchmark operation. Throughput under the profiler is reported separately "
                   "because the gc profiler perturbs timing; use section A for speed. "
                   "gc_time_ms is null where JMH emitted no gc.time metric, which it omits "
                   "when no collection happened during the run (gc_count 0)."),
        "per_dataset": {k: per_dataset[k] for k in sorted(per_dataset)},
    }


def metric_score(secondary: Dict[str, Any], key: str) -> Optional[float]:
    if key not in secondary:
        return None
    return as_float(secondary[key].get("score"))


def metric_error(secondary: Dict[str, Any], key: str) -> Optional[float]:
    if key not in secondary:
        return None
    return as_float(secondary[key].get("scoreError"))


def build_crossing(noop_records: List[Dict[str, Any]],
                   transfer_records: List[Dict[str, Any]],
                   pipeline: Optional[Dict[str, Any]],
                   fields_per_record: int) -> Dict[str, Any]:
    noop = {}
    for record in noop_records:
        name = record["benchmark"].rsplit(".", 1)[1]
        metric = primary(record)
        noop[name] = {
            "mean_nanos": metric["score"],
            "mean_nanos_error_99ci": score_error(metric),
        }

    transfer: Dict[str, Dict[str, Any]] = {}
    for record in transfer_records:
        name = record["benchmark"].rsplit(".", 1)[1]
        size = param(record, "bytes")
        metric = primary(record)
        transfer.setdefault(size, {})[name] = {
            "mean_nanos": metric["score"],
            "mean_nanos_error_99ci": score_error(metric),
        }

    for size, entry in transfer.items():
        if "touchArray" in entry and "touchDirect" in entry:
            delta = entry["touchArray"]["mean_nanos"] - entry["touchDirect"]["mean_nanos"]
            entry["array_minus_direct_nanos"] = delta
            entry["implied_copy_gb_per_second"] = (
                None if delta <= 0 else int(size) / delta)

    amortization = None
    noop_nanos = noop.get("noop", {}).get("mean_nanos")
    if pipeline is not None and noop_nanos is not None:
        records = pipeline["batch_records"]
        direct = pipeline["engines"].get("simdjson-jni-direct")
        per_field_crossings = records * fields_per_record
        amortization = {
            "noop_crossing_nanos": noop_nanos,
            "batch_records": records,
            "fields_extracted_per_record": fields_per_record,
            "crossings_per_batch_batch_api": 1,
            "crossings_per_batch_if_one_per_field": per_field_crossings,
            "crossing_overhead_micros_batch_api": noop_nanos / 1000.0,
            "crossing_overhead_micros_if_one_per_field": (
                per_field_crossings * noop_nanos / 1000.0),
        }
        if direct is not None:
            full = direct["measured_variants_micros"]["full"]["mean_micros"]
            amortization["measured_full_pipeline_micros"] = full
            amortization["crossing_share_of_pipeline_batch_api"] = (
                (noop_nanos / 1000.0) / full)
            amortization["crossing_share_of_pipeline_if_one_per_field"] = (
                (per_field_crossings * noop_nanos / 1000.0) / full)

    return {
        "method": ("JMH AverageTime in nanoseconds. noop crosses into an empty native function. "
                   "baselineJavaCall is a non-inlinable-free Java call for scale. touchDirect "
                   "calls GetDirectBufferAddress and reads two bytes; touchArray calls "
                   "GetByteArrayElements, reads two bytes and releases with JNI_ABORT, so its "
                   "cost includes the JVM's copy of the whole array. touchDirect performs the "
                   "same validation the real parse path performs (GetDirectBufferAddress plus "
                   "a GetDirectBufferCapacity padding check), so it is the true fixed overhead "
                   "of the zero-copy bridge, not a bare JNI entry."),
        "amortization_method": ("The batch extraction entry point makes one boundary crossing "
                               "per batch instead of one per extracted field. These figures "
                               "multiply the measured no-op crossing cost by the two crossing "
                               "counts and compare both against the measured full pipeline "
                               "time for the zero-copy engine."),
        "noop": noop,
        "amortization": amortization,
        "transfer_by_size_bytes": {k: transfer[k] for k in sorted(transfer, key=int)},
    }


def combine_errors(first: Optional[float], second: Optional[float]) -> Optional[float]:
    if first is None or second is None:
        return None
    return math.sqrt(first * first + second * second)


def resolved(value: float, error: Optional[float]) -> Optional[bool]:
    if error is None:
        return None
    return abs(value) > error


def build_pipeline(records: List[Dict[str, Any]], sizes: Dict[str, int],
                   environment: Dict[str, Any]) -> Dict[str, Any]:
    stages = {"stageScan": "scan", "stageScanMap": "scan_map", "stageScanMapValidate": "full"}
    per_engine: Dict[str, Dict[str, Any]] = {}
    for record in records:
        engine = param(record, "engine")
        stage = stages[record["benchmark"].rsplit(".", 1)[1]]
        metric = primary(record)
        per_engine.setdefault(engine, {})[stage] = {
            "mean_micros": metric["score"],
            "mean_micros_error_99ci": score_error(metric),
        }

    result = {}
    for engine, measured in per_engine.items():
        scan = measured["scan"]["mean_micros"]
        scan_map = measured["scan_map"]["mean_micros"]
        full = measured["full"]["mean_micros"]
        scan_error = measured["scan"]["mean_micros_error_99ci"]
        scan_map_error = measured["scan_map"]["mean_micros_error_99ci"]
        full_error = measured["full"]["mean_micros_error_99ci"]
        map_stage = scan_map - scan
        validate_stage = full - scan_map
        map_error = combine_errors(scan_map_error, scan_error)
        validate_error = combine_errors(full_error, scan_map_error)
        result[engine] = {
            "measured_variants_micros": measured,
            "stage_micros": {
                "parse_scan": scan,
                "map_to_listing": map_stage,
                "validate": validate_stage,
            },
            "stage_micros_error_99ci": {
                "parse_scan": scan_error,
                "map_to_listing": map_error,
                "validate": validate_error,
            },
            "stage_resolved_above_noise": {
                "parse_scan": resolved(scan, scan_error),
                "map_to_listing": resolved(map_stage, map_error),
                "validate": resolved(validate_stage, validate_error),
            },
            "stage_share_of_full": {
                "parse_scan": scan / full,
                "map_to_listing": map_stage / full,
                "validate": validate_stage / full,
            },
            "full_pipeline_mb_per_second": (
                sizes["vehicles-pipeline-batch"] / (full * 1.0e-6) / 1.0e6),
        }

    return {
        "method": ("Three JMH AverageTime variants per engine over the same NDJSON batch: "
                   "scan (walk every record, extract nothing), scan_map (scan plus build a "
                   "typed Listing record per row), full (scan_map plus run the validation "
                   "predicate). Stage costs are differences of measured variants: "
                   "map = scan_map - scan, validate = full - scan_map. Shares are those "
                   "stage costs divided by the full-pipeline time. This replaces a flamegraph "
                   "with measured wall-time differences. Stage errors are the JMH 99.9% "
                   "confidence half-widths of the two differenced variants combined in "
                   "quadrature; stage_resolved_above_noise is false when a stage cost is "
                   "smaller than that combined uncertainty and should be read as "
                   "'too small for this harness to resolve', not as a real value."),
        "caveat": ("The scan stage is not the same kind of work in both families. Jackson must "
                   "tokenize (jackson-stream) or materialise a tree (jackson-tree) before any "
                   "field can be read, while simdjson On Demand fuses structural scanning with "
                   "field extraction, so its scan variant only finds document boundaries. The "
                   "full-pipeline totals are the comparable numbers."),
        "workload": "vehicles-pipeline-batch",
        "batch_records": environment["pipeline_batch_records"],
        "batch_bytes": sizes.get("vehicles-pipeline-batch"),
        "engines": result,
    }


def build_scaling(records_by_threads: Dict[int, List[Dict[str, Any]]],
                  sizes: Dict[str, int]) -> Dict[str, Any]:
    batch_bytes = sizes["vehicles-latency-batch"]
    per_engine: Dict[str, Dict[str, Any]] = {}
    for threads, records in records_by_threads.items():
        for record in records:
            engine = param(record, "engine")
            metric = primary(record)
            per_engine.setdefault(engine, {})[str(threads)] = {
                "ops_per_second": metric["score"],
                "ops_per_second_error_99ci": score_error(metric),
                "mb_per_second": mb_per_second(metric["score"], batch_bytes),
            }

    for engine, by_threads in per_engine.items():
        if "1" in by_threads:
            base = by_threads["1"]["ops_per_second"]
            for threads, entry in by_threads.items():
                entry["scaling_vs_1_thread"] = entry["ops_per_second"] / base

    return {
        "method": ("JMH Throughput mode with -t 1, -t 2 and -t 4 on the same fixed NDJSON "
                   "batch, all threads sharing one input buffer."),
        "workload": "vehicles-latency-batch",
        "batch_bytes": batch_bytes,
        "engines": per_engine,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-dir", required=True)
    parser.add_argument("--wall-seconds", type=float, required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    base = args.results_dir
    environment = load(os.path.join(base, "environment.json"))
    sizes = dataset_bytes(environment)

    summary: Dict[str, Any] = {
        "benchmark": "simdjson-jni",
        "claim_under_test": ("Routing the JSON parsing hot loop out of the JVM into simdjson "
                             "through JNI wins, and the win only survives if the bytes stay "
                             "off the managed heap."),
        "environment": environment,
        "feed": load(os.path.join(base, "feed_manifest.json")),
        "equivalence": summarize_equivalence(load(os.path.join(base, "equivalence.json"))),
        "total_wall_seconds": args.wall_seconds,
    }

    failures = []

    throughput = load_optional(os.path.join(base, "raw_throughput.json"))
    if throughput:
        summary["A_throughput"] = build_throughput(throughput, sizes)
    else:
        failures.append("raw_throughput.json missing; section A not produced")

    latency = load_optional(os.path.join(base, "raw_latency.json"))
    if latency:
        summary["B_latency"] = build_latency(latency, sizes, environment)
    else:
        failures.append("raw_latency.json missing; section B not produced")

    allocation = load_optional(os.path.join(base, "raw_allocation.json"))
    if allocation:
        summary["C_allocation"] = build_allocation(allocation, sizes)
    else:
        failures.append("raw_allocation.json missing; section C not produced")

    pipeline = load_optional(os.path.join(base, "raw_pipeline.json"))
    pipeline_section = None
    if pipeline:
        pipeline_section = build_pipeline(pipeline, sizes, environment)
    else:
        failures.append("raw_pipeline.json missing; section E not produced")

    noop = load_optional(os.path.join(base, "raw_jni_noop.json"))
    transfer = load_optional(os.path.join(base, "raw_jni_transfer.json"))
    if noop and transfer:
        summary["D_jni_crossing"] = build_crossing(
            noop, transfer, pipeline_section, LISTING_FIELDS)
    else:
        failures.append("raw_jni_noop.json or raw_jni_transfer.json missing; section D not produced")

    if pipeline_section is not None:
        summary["E_pipeline_share"] = pipeline_section

    scaling = {}
    for path in sorted(glob.glob(os.path.join(base, "raw_scaling_t*.json"))):
        threads = int(re.search(r"raw_scaling_t(\d+)\.json$", path).group(1))
        records = load_optional(path)
        if records:
            scaling[threads] = records
    if len(scaling) >= 2:
        summary["F_scaling"] = build_scaling(scaling, sizes)
    else:
        failures.append("scaling runs incomplete; section F not produced")

    summary["failures"] = failures

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)
        handle.write("\n")
    print(f"wrote {args.out} failures={len(failures)}")
    return 0


def summarize_equivalence(report: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "mismatches": report["mismatches"],
        "engines": report["engines"],
        "checksum_definition": (
            "FNV-1a style 64-bit fold over every event in document order: container begin and "
            "end tags, object key UTF-8 byte length, string UTF-8 byte length after unescaping, "
            "int64 value bits for integral numbers, IEEE-754 raw bits for non-integral numbers, "
            "boolean value, null tag. Every engine must visit every scalar to produce it, so "
            "simdjson On Demand cannot stay lazy."),
        "datasets": [
            {
                "dataset": row["dataset"],
                "mode": row["mode"],
                "bytes": row["bytes"],
                "checksum": row["checksum"],
                "agree": row["agree"],
            }
            for row in report["datasets"]
        ],
        "pipeline": report.get("pipeline"),
    }


if __name__ == "__main__":
    raise SystemExit(main())
