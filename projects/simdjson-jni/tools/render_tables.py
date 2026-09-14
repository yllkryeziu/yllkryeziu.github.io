import argparse
import json
from typing import Any, Dict, List, Optional

ENGINES = ["jackson-tree", "jackson-stream", "simdjson-jni-copy", "simdjson-jni-direct"]


def number(value: Optional[float], digits: int = 1) -> str:
    if value is None:
        return "n/a"
    return f"{value:,.{digits}f}"


def with_error(value: Optional[float], error: Optional[float], digits: int = 1) -> str:
    if value is None:
        return "n/a"
    if error is None:
        return number(value, digits)
    return f"{number(value, digits)} ± {number(error, digits)}"


def table(headers: List[str], rows: List[List[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |",
             "|" + "|".join("---" for _ in headers) + "|"]
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def throughput_table(summary: Dict[str, Any]) -> str:
    section = summary["A_throughput"]
    rows = []
    for dataset, entry in section["per_dataset"].items():
        row = [dataset, f"{entry['bytes']:,}"]
        for engine in ENGINES:
            measured = entry["engines"][engine]
            row.append(with_error(measured["mb_per_second"],
                                  measured["mb_per_second_error_99ci"]))
        row.append(number(entry["speedup_vs_best_jvm_engine"]["simdjson-jni-direct"], 2) + "x")
        rows.append(row)

    aggregate = section["corpus_aggregate"]
    row = ["**corpus aggregate**", f"**{aggregate[ENGINES[0]]['total_corpus_bytes']:,}**"]
    for engine in ENGINES:
        row.append("**" + number(aggregate[engine]["aggregate_mb_per_second"]) + "**")
    best_jvm = max(("jackson-tree", "jackson-stream"),
                   key=lambda e: aggregate[e]["aggregate_mb_per_second"])
    row.append("**" + number(
        aggregate["simdjson-jni-direct"]["aggregate_mb_per_second"]
        / aggregate[best_jvm]["aggregate_mb_per_second"], 2) + "x**")
    rows.append(row)

    headers = ["dataset", "bytes"] + ENGINES + ["direct vs best JVM"]
    return table(headers, rows)


def allocation_table(summary: Dict[str, Any]) -> str:
    section = summary["C_allocation"]
    rows = []
    for dataset, entry in section["per_dataset"].items():
        row = [dataset]
        for engine in ENGINES:
            measured = entry["engines"][engine]
            row.append(number(measured["alloc_bytes_per_op"], 0))
        rows.append(row)
    return table(["dataset", *ENGINES], rows)


def gc_table(summary: Dict[str, Any]) -> str:
    section = summary["C_allocation"]
    rows = []
    for dataset, entry in section["per_dataset"].items():
        row = [dataset]
        for engine in ENGINES:
            measured = entry["engines"][engine]
            count = measured["gc_count"]
            time_ms = measured["gc_time_ms"]
            row.append(f"{number(count, 0)} / {number(time_ms, 0)}")
        rows.append(row)
    return table(["dataset (gc.count / gc.time ms)", *ENGINES], rows)


def latency_table(summary: Dict[str, Any]) -> str:
    section = summary["B_latency"]
    rows = []
    for engine in ENGINES:
        measured = section["engines"][engine]
        rows.append([
            engine,
            f"{measured['sample_count']:,}",
            with_error(measured["mean_micros"], measured["mean_micros_error_99ci"], 1),
            number(measured["p50_micros"]),
            number(measured["p90_micros"]),
            number(measured["p99_micros"]),
            number(measured["p99_9_micros"]),
            number(measured["p100_max_micros"]),
        ])
    return table(
        ["engine", "samples", "mean us", "p50", "p90", "p99", "p99.9", "max"], rows)


def crossing_table(summary: Dict[str, Any]) -> str:
    section = summary["D_jni_crossing"]
    rows = []
    for size, entry in section["transfer_by_size_bytes"].items():
        rows.append([
            f"{int(size):,}",
            with_error(entry["touchDirect"]["mean_nanos"],
                       entry["touchDirect"]["mean_nanos_error_99ci"], 1),
            with_error(entry["touchArray"]["mean_nanos"],
                       entry["touchArray"]["mean_nanos_error_99ci"], 1),
            number(entry.get("array_minus_direct_nanos"), 1),
            number(entry.get("implied_copy_gb_per_second"), 1),
        ])
    return table(
        ["payload bytes", "GetDirectBufferAddress ns", "GetByteArrayElements ns",
         "difference ns", "implied copy GB/s"], rows)


def pipeline_table(summary: Dict[str, Any]) -> str:
    section = summary["E_pipeline_share"]
    rows = []
    for engine, entry in section["engines"].items():
        stages = entry["stage_micros"]
        shares = entry["stage_share_of_full"]
        resolved = entry["stage_resolved_above_noise"]
        full = entry["measured_variants_micros"]["full"]
        rows.append([
            engine,
            with_error(full["mean_micros"], full["mean_micros_error_99ci"], 1),
            number(section["batch_bytes"] / (full["mean_micros"] * 1e-6) / 1e6),
            f"{number(stages['parse_scan'])} ({shares['parse_scan'] * 100:.1f}%)",
            f"{number(stages['map_to_listing'])} ({shares['map_to_listing'] * 100:.1f}%)",
            f"{number(stages['validate'])} ({shares['validate'] * 100:.1f}%)"
            + ("" if resolved["validate"] else " [below noise]"),
        ])
    return table(
        ["engine", "full pipeline us", "MB/s", "parse/scan", "map to Listing", "validate"], rows)


def scaling_table(summary: Dict[str, Any]) -> str:
    section = summary["F_scaling"]
    rows = []
    for engine in ENGINES:
        measured = section["engines"][engine]
        row = [engine]
        for threads in ("1", "2", "4"):
            entry = measured[threads]
            row.append(f"{number(entry['mb_per_second'])} ({entry['scaling_vs_1_thread']:.2f}x)")
        rows.append(row)
    return table(["engine", "1 thread MB/s", "2 threads", "4 threads"], rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary", required=True)
    args = parser.parse_args()

    with open(args.summary, encoding="utf-8") as handle:
        summary = json.load(handle)

    sections = [
        ("A. THROUGHPUT (MB/s, JMH 99.9% CI)", throughput_table),
        ("B. LATENCY DISTRIBUTION (microseconds)", latency_table),
        ("C. ALLOCATION (gc.alloc.rate.norm, bytes per operation)", allocation_table),
        ("C2. GC ACTIVITY (gc.count / gc.time ms)", gc_table),
        ("D. JNI CROSSING COST", crossing_table),
        ("E. PIPELINE STAGE SHARE", pipeline_table),
        ("F. THREAD SCALING", scaling_table),
    ]
    for title, renderer in sections:
        print(f"### {title}\n")
        print(renderer(summary))
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
