#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT}/scripts/platform.sh"

BUILD="${ROOT}/build"
RESULTS="${ROOT}/results"
DATA="${ROOT}/data"
JAR="${ROOT}/target/benchmarks.jar"

FORKS="${FORKS:-3}"
WARMUP_ITERATIONS="${WARMUP_ITERATIONS:-5}"
MEASURE_ITERATIONS="${MEASURE_ITERATIONS:-10}"
WARMUP_TIME="${WARMUP_TIME:-1s}"
MEASURE_TIME="${MEASURE_TIME:-1s}"
LATENCY_TIME="${LATENCY_TIME:-2s}"

export JAVA_HOME="$(resolve_java_home)"
JAVA="${JAVA_HOME}/bin/java"
MVN="${MVN:-mvn}"
PYTHON="${PYTHON:-python3}"

START_EPOCH="$(date +%s)"

mkdir -p "${BUILD}" "${RESULTS}"

echo "==> fetching dependencies"
bash "${ROOT}/scripts/fetch_deps.sh"

echo "==> building native bridge"
cmake -S "${ROOT}" -B "${BUILD}/cmake" -DCMAKE_BUILD_TYPE=Release >/dev/null
cmake --build "${BUILD}/cmake" --config Release -j "$(logical_cpus)" >/dev/null
LIBRARY="$(native_library_path "${BUILD}")"
test -f "${LIBRARY}"

echo "==> generating vehicle feed"
if [[ ! -f "${DATA}/vehicles.csv" ]]; then
  curl -sS -L --retry 3 --fail -o "${DATA}/vehicles.csv" \
    https://www.fueleconomy.gov/feg/epadata/vehicles.csv
fi
"${PYTHON}" "${ROOT}/tools/make_feed.py" \
  --csv "${DATA}/vehicles.csv" \
  --out "${DATA}/vehicles.ndjson" \
  --manifest "${RESULTS}/feed_manifest.json"

echo "==> building java"
"${MVN}" -q -f "${ROOT}/pom.xml" package -DskipTests
"${MVN}" -q -f "${ROOT}/pom.xml" dependency:build-classpath \
  -Dmdep.outputFile="${BUILD}/classpath.txt"
test -f "${JAR}"
CLASSPATH_TOOLS="${ROOT}/target/classes:$(cat "${BUILD}/classpath.txt")"

BENCH_JVM_FLAGS="${BENCH_JVM_FLAGS:--Xms2g -Xmx2g -XX:+UseG1GC}"
JVM_ARGS="-Dsimdjson.jni.library=${LIBRARY} -Dsimdjson.data.dir=${DATA} ${BENCH_JVM_FLAGS}"

echo "==> recording environment provenance"
TUNING_FLAG="$(cat "${BUILD}/tuning_flag.txt" 2>/dev/null || echo unrecorded)"
${JAVA} -cp "${CLASSPATH_TOOLS}" \
  ${JVM_ARGS} \
  -Dbench.cxx.version="$(cxx_version)" \
  -Dbench.cmake.version="$(cmake --version 2>&1 | sed -n 1p)" \
  -Dbench.maven.version="$("${MVN}" --version 2>&1 | sed -n 1p)" \
  -Dbench.python.version="$("${PYTHON}" --version)" \
  -Dbench.cpu.brand="$(cpu_brand)" \
  -Dbench.cpu.logical="$(logical_cpus)" \
  -Dbench.cpu.performance_cores="$(performance_cpus)" \
  -Dbench.cpu.efficiency_cores="$(efficiency_cpus)" \
  -Dbench.os.build="$(os_build)" \
  -Dbench.native.tuning_flag="${TUNING_FLAG}" \
  -Dbench.jmh.version=1.37 \
  -Dbench.jackson.version=2.18.2 \
  -Dbench.jvm.flags="${BENCH_JVM_FLAGS}" \
  dev.yll.simdjsonjni.EnvironmentMain "${RESULTS}/environment.json"

echo "==> verifying engine equivalence"
${JAVA} -cp "${CLASSPATH_TOOLS}" \
  ${JVM_ARGS} dev.yll.simdjsonjni.EquivalenceMain "${RESULTS}/equivalence.json"

run_jmh() {
  local label="$1"
  shift
  echo "==> jmh ${label}"
  ${BENCH_PIN:-} ${JAVA} -cp "${JAR}" org.openjdk.jmh.Main "$@" \
    -jvmArgs "${JVM_ARGS}" \
    -rf json -rff "${RESULTS}/raw_${label}.json"
}

run_jmh throughput "dev.yll.simdjsonjni.bench.ThroughputBenchmark" \
  -f "${FORKS}" -wi "${WARMUP_ITERATIONS}" -w "${WARMUP_TIME}" \
  -i "${MEASURE_ITERATIONS}" -r "${MEASURE_TIME}" -t 1

run_jmh allocation "dev.yll.simdjsonjni.bench.ThroughputBenchmark" \
  -f "${FORKS}" -wi "${WARMUP_ITERATIONS}" -w "${WARMUP_TIME}" \
  -i "${MEASURE_ITERATIONS}" -r "${MEASURE_TIME}" -t 1 -prof gc

run_jmh latency "dev.yll.simdjsonjni.bench.LatencyBenchmark" \
  -f "${FORKS}" -wi "${WARMUP_ITERATIONS}" -w "${LATENCY_TIME}" \
  -i "${MEASURE_ITERATIONS}" -r "${LATENCY_TIME}" -t 1

run_jmh jni_noop "dev.yll.simdjsonjni.bench.JniNoopBenchmark" \
  -f "${FORKS}" -wi "${WARMUP_ITERATIONS}" -w "${WARMUP_TIME}" \
  -i "${MEASURE_ITERATIONS}" -r "${MEASURE_TIME}" -t 1

run_jmh jni_transfer "dev.yll.simdjsonjni.bench.JniTransferBenchmark" \
  -f "${FORKS}" -wi "${WARMUP_ITERATIONS}" -w "${WARMUP_TIME}" \
  -i "${MEASURE_ITERATIONS}" -r "${MEASURE_TIME}" -t 1

run_jmh pipeline "dev.yll.simdjsonjni.bench.PipelineBenchmark" \
  -f "${FORKS}" -wi "${WARMUP_ITERATIONS}" -w "${WARMUP_TIME}" \
  -i "${MEASURE_ITERATIONS}" -r "${MEASURE_TIME}" -t 1

for threads in ${SCALING_THREADS:-1 2 4}; do
  run_jmh "scaling_t${threads}" "dev.yll.simdjsonjni.bench.ScalingBenchmark" \
    -f "${FORKS}" -wi "${WARMUP_ITERATIONS}" -w "${WARMUP_TIME}" \
    -i "${MEASURE_ITERATIONS}" -r "${MEASURE_TIME}" -t "${threads}"
done

END_EPOCH="$(date +%s)"
WALL_SECONDS="$((END_EPOCH - START_EPOCH))"

echo "==> distilling results"
"${PYTHON}" "${ROOT}/tools/summarize.py" \
  --results-dir "${RESULTS}" \
  --wall-seconds "${WALL_SECONDS}" \
  --out "${RESULTS}/summary.json"

echo "==> done in ${WALL_SECONDS}s"
