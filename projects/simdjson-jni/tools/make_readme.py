import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(ROOT, "results")
BEGIN = "<!-- RESULTS:BEGIN -->"
END = "<!-- RESULTS:END -->"

ENGINES = ("jackson-tree", "jackson-stream", "simdjson-jni-copy", "simdjson-jni-direct")
LABELS = {
    "jackson-tree": "jackson-tree",
    "jackson-stream": "jackson-stream",
    "simdjson-jni-copy": "simdjson-jni-copy",
    "simdjson-jni-direct": "simdjson-jni-direct",
}


def load(name):
    with open(os.path.join(RESULTS, name), encoding="utf-8") as handle:
        return json.load(handle)


def mean_over_corpus(allocation, engine, key):
    values = [row["engines"][engine][key] for row in allocation.values()]
    return sum(values) / len(values)


def build() -> str:
    summary = load("summary.json")
    environment = load("environment.json")
    equivalence = load("equivalence.json")

    throughput = summary["A_throughput"]
    aggregate = throughput["corpus_aggregate"]
    best_jvm = max(aggregate["jackson-tree"]["aggregate_mb_per_second"],
                   aggregate["jackson-stream"]["aggregate_mb_per_second"])
    best_native = aggregate["simdjson-jni-direct"]["aggregate_mb_per_second"]

    lines = [BEGIN, "", "## Measured results", "",
             f"Generated from `results/summary.json`. Hardware: {environment['toolchain']['cpu.brand']}, "
             f"simdjson {environment['simdjson']['version']} on its "
             f"`{environment['simdjson']['active_implementation']}` kernel, "
             f"{environment['jvm']['java.vm.name']} {environment['jvm']['java.runtime.version']}.",
             "",
             f"Engine equivalence gate: **{equivalence['mismatches']} mismatches** across "
             f"{len(equivalence['datasets'])} datasets.", ""]

    lines += ["### Throughput (MB/s, 99.9% CI half-width)", "",
              "| dataset | " + " | ".join(LABELS[e] for e in ENGINES) + " | speedup |",
              "| --- | " + " | ".join("---:" for _ in ENGINES) + " | ---: |"]
    for name in sorted(throughput["per_dataset"]):
        row = throughput["per_dataset"][name]
        cells = []
        for engine in ENGINES:
            value = row["engines"][engine]
            error = value.get("mb_per_second_error_99ci")
            cells.append(f"{value['mb_per_second']:.0f} ± {error:.0f}" if error
                         else f"{value['mb_per_second']:.0f}")
        speedup = row["speedup_vs_best_jvm_engine"]["simdjson-jni-direct"]
        lines.append(f"| {name} | " + " | ".join(cells) + f" | {speedup:.2f}x |")
    lines += ["",
              f"Corpus aggregate (total bytes over total time): **{best_native:.0f} MB/s** for the "
              f"zero-copy path against **{best_jvm:.0f} MB/s** for the best JVM engine, a factor of "
              f"**{best_native / best_jvm:.2f}**.", ""]

    crossing = summary["D_jni_crossing"]
    noop = crossing["noop"]["noop"]["mean_nanos"]
    amortization = crossing["amortization"]
    lines += ["### Boundary cost", "",
              f"- One JNI crossing into an empty native function: **{noop:.2f} ns** "
              f"(plain Java call: {crossing['noop']['baselineJavaCall']['mean_nanos']:.2f} ns).",
              f"- Batch API, one crossing per {amortization['batch_records']:,}-record batch: "
              f"{amortization['crossing_share_of_pipeline_batch_api'] * 100:.5f}% of pipeline time.",
              f"- Hypothetical one crossing per field "
              f"({amortization['crossings_per_batch_if_one_per_field']:,} crossings): "
              f"{amortization['crossing_share_of_pipeline_if_one_per_field'] * 100:.1f}% of pipeline time.",
              "",
              "The boundary is cheap. Crossing it often is not.", ""]

    allocation = summary["C_allocation"]["per_dataset"]
    lines += ["### Allocation (Java heap per parse, corpus mean)", "",
              "| engine | bytes per parse | bytes per input byte | GC events |",
              "| --- | ---: | ---: | ---: |"]
    for engine in ENGINES:
        per_op = mean_over_corpus(allocation, engine, "alloc_bytes_per_op")
        per_byte = mean_over_corpus(allocation, engine, "alloc_bytes_per_input_byte")
        gc = mean_over_corpus(allocation, engine, "gc_count")
        rendered = f"{per_op / 1e6:.1f} MB" if per_op > 1000 else f"{per_op:.0f} B"
        per_byte_text = f"{per_byte:.1f}" if per_byte > 1 else f"{per_byte:.1e}"
        lines.append(f"| {LABELS[engine]} | {rendered} | {per_byte_text} | {gc:.0f} |")
    lines.append("")

    latency = summary["B_latency"]["engines"]
    lines += ["### Per-batch latency (microseconds)", "",
              "| engine | mean | p50 | p99 | p99.9 | samples |",
              "| --- | ---: | ---: | ---: | ---: | ---: |"]
    for engine in ENGINES:
        row = latency[engine]
        lines.append(
            f"| {LABELS[engine]} | {row['mean_micros']:.1f} | {row['p50_micros']:.1f} | "
            f"{row['p99_micros']:.1f} | {row['p99_9_micros']:.1f} | {row['sample_count']:,} |")
    lines += ["",
              "The p99/p50 ratio is essentially unchanged between families "
              f"({latency['jackson-stream']['p99_micros'] / latency['jackson-stream']['p50_micros']:.2f} "
              f"for jackson-stream against "
              f"{latency['simdjson-jni-direct']['p99_micros'] / latency['simdjson-jni-direct']['p50_micros']:.2f} "
              "for the zero-copy path). Everything got faster in proportion; predictability did not "
              "improve.", ""]

    pipeline = summary["E_pipeline_share"]["engines"]
    lines += ["### Pipeline stage shares", "",
              "| engine | full pipeline | parse | map | validate | MB/s |",
              "| --- | ---: | ---: | ---: | ---: | ---: |"]
    for engine, row in pipeline.items():
        share = row["stage_share_of_full"]
        lines.append(
            f"| {LABELS[engine]} | {row['measured_variants_micros']['full']['mean_micros'] / 1000:.1f} ms | "
            f"{share['parse_scan'] * 100:.1f}% | {share['map_to_listing'] * 100:.1f}% | "
            f"{share['validate'] * 100:.1f}% | {row['full_pipeline_mb_per_second']:.0f} |")
    lines += ["", "Parsing stops being the bottleneck. Object mapping becomes it.", "", END]
    return "\n".join(lines)


def main() -> None:
    path = os.path.join(ROOT, "README.md")
    with open(path, encoding="utf-8") as handle:
        readme = handle.read()

    block = build()
    if BEGIN in readme and END in readme:
        head = readme.split(BEGIN)[0]
        tail = readme.split(END)[1]
        readme = head + block + tail
    else:
        readme = readme.rstrip() + "\n\n" + block + "\n"

    with open(path, "w", encoding="utf-8") as handle:
        handle.write(readme)
    print("wrote README.md results block")


if __name__ == "__main__":
    main()
