import React from 'react';
import Article, { H2, H3, Note, KeyNumbers } from './post/Article';
import Figure from './post/Figure';
import Table from './post/Table';
import Code from './post/Code';
import { M, Eq } from './post/Math';
import References, { makeCite } from './post/References';
import { BarChart, GroupedBarChart } from './post/Charts';
import { ClassificationFigure, MemoryFigure } from './post/SimdFigures';
import { SIMD_REFS, SIMD_BIBTEX } from './post/refsSimd';
import { POST_BY_SLUG } from './post/posts';
import results from './post/results/simdjson.json';

const Cite = makeCite(SIMD_REFS);
const meta = POST_BY_SLUG.simd;

const TOC = [
  { id: 'origin', label: 'Where this comes from' },
  { id: 'slow', label: 'Why a general-purpose parser is slow' },
  { id: 'boundary', label: 'The boundary, and what it costs' },
  { id: 'model', label: 'A cost model, written down first' },
  { id: 'honest', label: 'Making the comparison honest' },
  { id: 'setup', label: 'Setup' },
  { id: 'throughput', label: 'Throughput' },
  { id: 'zerocopy', label: 'What zero-copy is worth' },
  { id: 'allocation', label: 'The number that is not close' },
  { id: 'latency', label: 'The tail, and a claim that did not survive' },
  { id: 'pipeline', label: 'Where the time goes afterwards' },
  { id: 'scaling', label: 'Scaling' },
  { id: 'limits', label: 'What this does not show' },
];

const ENV = results.environment;
const SUM = results.summary;
const EQ = results.equivalence;

const ENGINES = ['jackson-tree', 'jackson-stream', 'simdjson-jni-copy', 'simdjson-jni-direct'];
const LABEL: Record<string, string> = {
  'jackson-tree': 'Jackson tree',
  'jackson-stream': 'Jackson streaming',
  'simdjson-jni-copy': 'simdjson, copying bridge',
  'simdjson-jni-direct': 'simdjson, zero-copy',
};

const num = (value: number) => value.toLocaleString('en-US');
const mb = (value: number, digits = 0) => value.toFixed(digits);
const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

const throughput = SUM.A_throughput;
const aggregate = throughput.corpus_aggregate;
const bestJvm = Math.max(
  aggregate['jackson-tree'].aggregate_mb_per_second,
  aggregate['jackson-stream'].aggregate_mb_per_second,
);
const bestNative = aggregate['simdjson-jni-direct'].aggregate_mb_per_second;
const aggregateSpeedup = bestNative / bestJvm;

const datasets = Object.keys(throughput.per_dataset).sort();
const speedups = datasets.map(
  name => throughput.per_dataset[name].speedup_vs_best_jvm_engine['simdjson-jni-direct'],
);
const minSpeedup = Math.min(...speedups);
const maxSpeedup = Math.max(...speedups);
const minSpeedupDataset = datasets[speedups.indexOf(minSpeedup)];
const maxSpeedupDataset = datasets[speedups.indexOf(maxSpeedup)];

const zeroCopy = datasets
  .map(name => {
    const engines = throughput.per_dataset[name].engines;
    return {
      name,
      gain: engines['simdjson-jni-direct'].mb_per_second / engines['simdjson-jni-copy'].mb_per_second - 1,
      direct: engines['simdjson-jni-direct'].mb_per_second,
      copy: engines['simdjson-jni-copy'].mb_per_second,
    };
  })
  .sort((a, b) => b.gain - a.gain);

const crossingNanos = SUM.D_jni_crossing.noop.noop.mean_nanos;
const javaCallNanos = SUM.D_jni_crossing.noop.baselineJavaCall.mean_nanos;
const amortization = SUM.D_jni_crossing.amortization;

const breakEvenBytes =
  (crossingNanos * 1e-9) / (1 / (bestJvm * 1e6) - 1 / (bestNative * 1e6));

const allocation = SUM.C_allocation.per_dataset;
const allocationMean = (engine: string, key: 'alloc_bytes_per_input_byte' | 'alloc_bytes_per_op' | 'gc_count') => {
  const values = Object.values(allocation).map((row: any) => row.engines[engine][key]);
  return values.reduce((sum: number, value: number) => sum + value, 0) / values.length;
};

const latency = SUM.B_latency.engines;
const pipeline = SUM.E_pipeline_share.engines;
const scaling = SUM.F_scaling.engines;
const THREADS = ['1', '2', '4', '8', '16'];

const JAVA_SIDE = `public final class SimdJson implements AutoCloseable {
    static { System.loadLibrary("simdjson_jni"); }

    private final ByteBuffer arena =
        ByteBuffer.allocateDirect((1 << 24) + PADDING);

    private static native long parse(ByteBuffer buffer, int length);

    public Document ingest(ReadableByteChannel feed) throws IOException {
        arena.clear();
        int length = feed.read(arena);
        return new Document(parse(arena, length));
    }
}`;

const NATIVE_SIDE = `extern "C" JNIEXPORT jlong JNICALL
Java_dev_yll_simdjsonjni_SimdJson_parse(JNIEnv* env, jclass, jobject buffer, jint length) {
    auto* data = static_cast<const uint8_t*>(env->GetDirectBufferAddress(buffer));
    if (data == nullptr) { throwParse(env, "not a direct buffer"); return 0; }

    jlong capacity = env->GetDirectBufferCapacity(buffer);
    if (capacity < static_cast<jlong>(length) + simdjson::SIMDJSON_PADDING) {
        throwParse(env, "buffer lacks SIMDJSON_PADDING tail");
        return 0;
    }

    auto* document = new ondemand::document();
    auto error = parser.iterate(data, length, capacity).get(*document);
    if (error) { delete document; throwParse(env, error_message(error)); return 0; }
    return reinterpret_cast<jlong>(document);
}`;

const BlogSimdjson: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <Article
    onBack={onBack}
    kicker={meta.kicker}
    title={meta.title}
    dek={meta.dek}
    date={meta.date}
    readingMinutes={meta.readingMinutes}
    repo={meta.repo}
    toc={TOC}
  >
    <KeyNumbers
      items={[
        {
          k: 'throughput',
          v: `${aggregateSpeedup.toFixed(1)}x`,
          s: `${mb(bestNative)} MB/s against ${mb(bestJvm)} MB/s for the best JVM parser`,
        },
        {
          k: 'boundary cost',
          v: `${crossingNanos.toFixed(1)} ns`,
          s: 'one JNI crossing, measured, against 0.34 ns for a plain Java call',
        },
        {
          k: 'heap per parse',
          v: `${allocationMean('simdjson-jni-direct', 'alloc_bytes_per_op').toFixed(0)} B`,
          s: `where Jackson's tree parser allocates ${(allocationMean('jackson-tree', 'alloc_bytes_per_op') / 1e6).toFixed(1)} MB`,
        },
      ]}
    />

    <H2 id="origin">Where this comes from</H2>
    <p>
      At Porsche Informatik I worked on a Java platform that ingests vehicle data feeds across
      Volkswagen Group brands. The innermost loop, turning bytes into objects, was expensive enough
      that we moved it into a native C++ module reached through JNI.
    </p>
    <p>
      Those numbers are not mine to publish. So this post is the technique rebuilt as something
      anyone can run: public datasets, a pinned toolchain, and a harness that reproduces every figure
      below from a clean checkout. The claim under test is narrower than "simdjson is fast", which is
      not in dispute. It is whether reaching a SIMD parser across the JNI boundary is worth it once
      you account for what the boundary costs, and the answer requires measuring the boundary rather
      than assuming it.
    </p>

    <H2 id="slow">Why a general-purpose parser is slow</H2>
    <p>
      A conventional JSON parser is a state machine over bytes: read one, branch on it, sometimes
      allocate. Two properties of that loop are expensive on a modern core.
    </p>
    <p>
      The branches are unpredictable by construction. Where the next quote or comma falls is a
      property of the data rather than the code, so the branch predictor has nothing to learn, and
      JSON offers a decision point every few bytes. The second cost is allocation: a tree parser
      materialises a node per value, and that memory has to be zeroed, written, traced and collected.
    </p>
    <p>
      SIMD parsing restructures the question. Instead of asking "what is this byte" n times, it asks
      "which of these 32 or 64 bytes are quotes" once, and gets a bitmask back<Cite ids={[1]} />.
    </p>

    <Figure
      n={1}
      caption={
        <>
          One vector compare classifies a whole register. A few more give the structural characters
          and the whitespace. Bit manipulation over those masks, including a prefix-XOR to find
          quoted regions, produces a structural index: the positions that actually matter. The second
          stage visits only those. The per-byte branch is gone, and the remaining work is
          straight-line vector code. The same approach validates UTF-8 in well under one instruction
          per byte<Cite ids={[2]} />.
        </>
      }
    >
      <ClassificationFigure />
    </Figure>

    <H2 id="boundary">The boundary, and what it costs</H2>
    <p>
      simdjson is C++ and the service is Java. JNI offers two ways to hand a native function a block
      of bytes, and they are not equivalent<Cite ids={[4]} />.
    </p>
    <p>
      <code>GetByteArrayElements</code> takes a <code>byte[]</code> on the managed heap. The JVM is
      permitted to copy it, because the collector must stay free to move objects while native code
      runs. <code>ByteBuffer.allocateDirect</code> allocates outside the heap: the Java object holds
      an address and a capacity, and the bytes sit in memory the collector can neither see nor
      relocate. <code>GetDirectBufferAddress</code> hands the native side that address.
    </p>

    <Figure
      n={2}
      caption={
        <>
          The same bytes, two views. The harness does not take the copying behaviour on faith. It
          calls <code>GetByteArrayElements</code> at sizes from 16 B to 8 MiB and records the{' '}
          <code>isCopy</code> flag the JVM reports. On this JVM the answer is <code>true</code> at
          every size tested, so the copying bridge is what you actually get when you pass an array.
        </>
      }
    >
      <MemoryFigure />
    </Figure>

    <Code language="java" file="src/main/java/dev/yll/simdjsonjni/SimdJson.java">{JAVA_SIDE}</Code>
    <Code language="cpp" file="native/simdjson_jni.cpp">{NATIVE_SIDE}</Code>

    <H2 id="model">A cost model, written down first</H2>
    <p>
      Let <M>{String.raw`n`}</M> be the payload in bytes, <M>{String.raw`B_{\text{parse}}`}</M> the
      native parser's bandwidth, <M>{String.raw`B_{\text{java}}`}</M> the JVM parser's bandwidth, and{' '}
      <M>{String.raw`C`}</M> the fixed cost of crossing the boundary once.
    </p>

    <Eq>{String.raw`T_{\text{java}}(n) = \frac{n}{B_{\text{java}}} \qquad T_{\text{direct}}(n) = C + \frac{n}{B_{\text{parse}}}`}</Eq>

    <p>
      Crossing is worth it when <M>{String.raw`T_{\text{direct}} < T_{\text{java}}`}</M>, which gives a
      break-even payload size:
    </p>

    <Eq>{String.raw`n^{*} = \frac{C}{\frac{1}{B_{\text{java}}} - \frac{1}{B_{\text{parse}}}}`}</Eq>

    <p>
      Every term is measurable. <M>{String.raw`C`}</M> is a no-op JNI call, and the two bandwidths are
      throughput benchmarks. Section 7 fills them in. The model is deliberately naive, since it
      ignores per-call effects that matter at very small <M>{String.raw`n`}</M>, so treat the
      resulting threshold as an order of magnitude rather than a precise crossover.
    </p>

    <H2 id="honest">Making the comparison honest</H2>
    <p>
      Measurement setup is the part of a parser benchmark that is easiest to get wrong, so it comes
      before the results.
    </p>
    <p>
      simdjson's On Demand API is lazy. It does not parse a document so much as promise to. A
      benchmark that hands it bytes and reads nothing measures almost nothing and reports a
      spectacular, fictional speedup. Any comparison has to force every engine to do the same work.
    </p>
    <p>
      The harness does that with a checksum every engine must produce: an FNV-1a fold, in document
      order, over every container boundary, every object key's UTF-8 length, every string's unescaped
      UTF-8 length, the int64 bits of every integral number, the raw IEEE-754 bits of every
      non-integral number, every boolean and every null. There is no way to produce that value without
      visiting every scalar. All four engines then have to agree, on every dataset, before any timing
      runs.
    </p>

    <Note label="Equivalence gate">
      <p>
        {EQ.mismatches} mismatches across {EQ.datasets.length} datasets. Agreement on the raw bits of
        every non-integral number is stronger than it sounds: float parsing is a classic source of
        silent disagreement between JSON implementations, and <code>canada.json</code> is essentially
        a few megabytes of coordinates. Two independently written parsers landing on bit-identical
        doubles across it is what makes the performance comparison meaningful, because the engines are
        demonstrably computing the same function.
      </p>
    </Note>

    <H2 id="setup">Setup</H2>

    <Table
      n={1}
      caption="Recorded by the harness at run time and written into results/environment.json alongside a sha256 for every dataset."
      columns={[
        { key: 'k', label: 'Component' },
        { key: 'v', label: 'Value' },
      ]}
      rows={[
        { k: 'CPU', v: `${ENV.toolchain['cpu.brand']}, ${ENV.toolchain['cpu.logical']} logical cores` },
        { k: 'OS', v: ENV.toolchain['os.build'] },
        { k: 'JVM', v: `${ENV.jvm['java.vm.name']} ${ENV.jvm['java.runtime.version']} (${ENV.jvm['java.vm.vendor']})` },
        { k: 'simdjson', v: `${ENV.simdjson.version}, active implementation ${ENV.simdjson.active_implementation}` },
        { k: 'Compiler', v: `${ENV.toolchain['cxx.version']}, ${ENV.toolchain['native.tuning_flag']}` },
        { k: 'Jackson', v: ENV.toolchain['jackson.version'] },
        { k: 'JMH', v: `${ENV.toolchain['jmh.version']}, 3 forks, 5 warmup and 10 measurement iterations` },
        { k: 'JVM flags', v: ENV.toolchain['jvm.flags'] },
      ]}
    />

    <p>
      Note the active implementation. On this machine simdjson selects its{' '}
      <strong>{ENV.simdjson.active_implementation}</strong> kernel, which is the AVX-512 path rather
      than the SSE or NEON fallbacks. Datasets are the standard simdjson corpus of real API payloads{' '}
      <Cite ids={[8]} /> plus two additions: a live response from the NHTSA vPIC production API, and a{' '}
      {num(69781988 / 1e6 | 0)} MB NDJSON feed built from the EPA's public vehicle dataset
      <Cite ids={[9]} />, which stands in for the automotive ingestion workload that motivated the
      exercise. Error bars throughout are JMH's 99.9% confidence half-widths. Where a difference is
      smaller than its error bar, I say so.
    </p>

    <H2 id="throughput">Throughput</H2>

    <Table
      n={2}
      caption={
        <>
          Single-threaded parse throughput in MB/s, with 99.9% confidence half-widths. The speedup
          column compares the zero-copy native path against whichever JVM engine was faster on that
          document, which is Jackson streaming in every case.
        </>
      }
      columns={[
        { key: 'ds', label: 'Dataset' },
        { key: 'size', label: 'Size', numeric: true },
        { key: 'tree', label: 'Jackson tree', numeric: true },
        { key: 'stream', label: 'Jackson stream', numeric: true },
        { key: 'copy', label: 'JNI copy', numeric: true },
        { key: 'direct', label: 'JNI zero-copy', numeric: true },
        { key: 'sp', label: 'Speedup', numeric: true },
      ]}
      rows={datasets.map(name => {
        const row = throughput.per_dataset[name];
        const cell = (engine: string) => {
          const value = row.engines[engine];
          const error = value.mb_per_second_error_99ci;
          return error ? `${mb(value.mb_per_second)} ± ${mb(error)}` : mb(value.mb_per_second);
        };
        return {
          ds: name.replace('.json', ''),
          size: `${(row.bytes / 1e6).toFixed(1)} MB`,
          tree: cell('jackson-tree'),
          stream: cell('jackson-stream'),
          copy: cell('simdjson-jni-copy'),
          direct: cell('simdjson-jni-direct'),
          sp: `${row.speedup_vs_best_jvm_engine['simdjson-jni-direct'].toFixed(2)}x`,
        };
      })}
    />

    <p>
      The speedup ranges from {minSpeedup.toFixed(2)}x on{' '}
      <code>{minSpeedupDataset.replace('.json', '')}</code> to {maxSpeedup.toFixed(2)}x on{' '}
      <code>{maxSpeedupDataset.replace('.json', '')}</code>. A single speedup number for a JSON parser
      is close to meaningless without naming the document, which is worth remembering whenever you
      read one. Aggregated over the corpus by total bytes divided by total time, the zero-copy path
      reaches {mb(bestNative)} MB/s against {mb(bestJvm)} MB/s for Jackson streaming, a factor of{' '}
      {aggregateSpeedup.toFixed(2)}.
    </p>
    <p>
      The spread has a cause. <code>canada.json</code> is dense floating-point data, where Jackson's
      number parsing dominates and simdjson's fast float path wins by {maxSpeedup.toFixed(1)}x.{' '}
      <code>twitterescaped</code> is full of escape sequences, which forces simdjson off its fast
      string path and narrows the gap to {minSpeedup.toFixed(1)}x.
    </p>

    <H3>Checking the cost model</H3>
    <p>
      A single JNI crossing into an empty native function costs{' '}
      <strong>{crossingNanos.toFixed(2)} ns</strong>, against {javaCallNanos.toFixed(2)} ns for a
      plain Java call. Substituting that and the two measured bandwidths into the model:
    </p>

    <Eq>{String.raw`n^{*} = \frac{${crossingNanos.toFixed(1)}\ \text{ns}}{\frac{1}{${mb(bestJvm)}\ \text{MB/s}} - \frac{1}{${mb(bestNative)}\ \text{MB/s}}} \approx ${breakEvenBytes.toFixed(0)}\ \text{bytes}`}</Eq>

    <p>
      The break-even payload is about {breakEvenBytes.toFixed(0)} bytes. For any realistic JSON
      document the fixed cost of crossing is irrelevant, and the anxiety about JNI overhead that
      surrounds this design is misplaced at the level of a single call.
    </p>
    <p>
      It is entirely relevant at the level of call frequency. The batch extraction path makes one
      crossing per batch of {num(amortization.batch_records)} records rather than one per extracted
      field. At {amortization.fields_extracted_per_record} fields per record, the per-field design
      would make {num(amortization.crossings_per_batch_if_one_per_field)} crossings, costing{' '}
      {amortization.crossing_overhead_micros_if_one_per_field.toFixed(0)} µs, or{' '}
      {pct(amortization.crossing_share_of_pipeline_if_one_per_field)} of the measured pipeline. The
      batch design spends {pct(amortization.crossing_share_of_pipeline_batch_api, 5)}.
    </p>

    <Note label="The actual design rule">
      <p>
        The boundary is cheap and crossing it often is not. At {crossingNanos.toFixed(1)} ns per
        crossing you can afford to enter native code once per request, or once per batch. You cannot
        afford to enter it once per field. That is the sentence I would have wanted before starting,
        and it is a statement about API shape rather than about JNI.
      </p>
    </Note>

    <H2 id="zerocopy">What zero-copy is worth</H2>
    <p>
      The received wisdom is that the direct buffer is the whole trick. It is a real effect, and it is
      smaller than that framing suggests.
    </p>

    <Figure
      n={3}
      caption={
        <>
          Throughput gain of the zero-copy bridge over the copying bridge, same parser and same
          documents. The gain tracks how fast the document parses: when parsing is quick the copy is a
          larger share of total time, and when parsing is slow the copy disappears into it.
        </>
      }
    >
      <BarChart
        title="Zero-copy premium by document"
        sub="Throughput gain of GetDirectBufferAddress over GetByteArrayElements"
        unit="faster than the copying bridge"
        labelWidth={150}
        data={zeroCopy.map((row, index) => ({
          label: row.name.replace('.json', ''),
          value: row.gain * 100,
          display: `+${pct(row.gain)}`,
          subject: index === 0,
          note: `${mb(row.copy)} -> ${mb(row.direct)} MB/s`,
        }))}
      />
    </Figure>

    <p>
      The premium runs from {pct(zeroCopy[zeroCopy.length - 1].gain)} on{' '}
      <code>{zeroCopy[zeroCopy.length - 1].name.replace('.json', '')}</code> to{' '}
      {pct(zeroCopy[0].gain)} on <code>{zeroCopy[0].name.replace('.json', '')}</code>. The error bars
      in Table 2 are tight enough to resolve all of these. The mechanism is straightforward: memcpy
      runs at tens of GB/s while the parser runs at one to four GB/s, so the copy is a single-digit
      percentage of the work for most documents and rises toward thirty percent for the documents that
      parse fastest.
    </p>
    <p>
      Worth being clear about what this corrects. Zero-copy is worth having and costs nothing to
      adopt, so use it. The {aggregateSpeedup.toFixed(1)}x overall gain comes from the parsing
      algorithm, and the direct buffer contributes a few percent of it on a typical document.
    </p>

    <H2 id="allocation">The number that is not close</H2>
    <p>
      Throughput is the number people quote. Allocation is the number that decides whether a service
      is pleasant to operate, and it is not a close comparison.
    </p>

    <Table
      n={3}
      caption={
        <>
          Java heap allocated per parse, from JMH's <code>gc</code> profiler, averaged across the
          corpus. The native engines allocate a fixed handful of bytes per call regardless of document
          size, because the document lives in native memory and Java holds only a handle.
        </>
      }
      columns={[
        { key: 'engine', label: 'Engine' },
        { key: 'perop', label: 'Bytes per parse', numeric: true },
        { key: 'perbyte', label: 'Bytes per input byte', numeric: true },
        { key: 'gc', label: 'GC events', numeric: true },
      ]}
      rows={ENGINES.map(engine => ({
        engine: LABEL[engine],
        perop: allocationMean(engine, 'alloc_bytes_per_op') > 1000
          ? `${(allocationMean(engine, 'alloc_bytes_per_op') / 1e6).toFixed(1)} MB`
          : `${allocationMean(engine, 'alloc_bytes_per_op').toFixed(0)} B`,
        perbyte: allocationMean(engine, 'alloc_bytes_per_input_byte') > 1
          ? allocationMean(engine, 'alloc_bytes_per_input_byte').toFixed(1)
          : allocationMean(engine, 'alloc_bytes_per_input_byte').toExponential(1),
        gc: allocationMean(engine, 'gc_count').toFixed(0),
        highlight: engine === 'simdjson-jni-direct',
      }))}
    />

    <p>
      Averaged across the corpus, Jackson's tree parser allocates{' '}
      {(allocationMean('jackson-tree', 'alloc_bytes_per_op') / 1e6).toFixed(1)} MB of Java heap per
      parse, or about {allocationMean('jackson-tree', 'alloc_bytes_per_input_byte').toFixed(1)} bytes
      for every byte of input. The zero-copy native path allocates{' '}
      {allocationMean('simdjson-jni-direct', 'alloc_bytes_per_op').toFixed(0)} bytes per parse,
      independent of document size, because the parsed document lives in native memory and Java holds
      a handle to it. That is a ratio of roughly{' '}
      {num(Math.round(allocationMean('jackson-tree', 'alloc_bytes_per_op') / allocationMean('simdjson-jni-direct', 'alloc_bytes_per_op') / 1000) * 1000)}
      {' '}to one, and it takes garbage collections during the measurement window from{' '}
      {allocationMean('jackson-tree', 'gc_count').toFixed(0)} to zero. That difference changes the
      operational character of an ingestion service and is invisible in a throughput chart.
    </p>

    <H2 id="latency">The tail, and a claim that did not survive</H2>

    <Table
      n={4}
      caption={
        <>
          Per-batch parse latency in microseconds, JMH SampleTime mode over a fixed 256-record NDJSON
          batch of real EPA vehicle records, with sample counts in the hundreds of thousands.
        </>
      }
      columns={[
        { key: 'engine', label: 'Engine' },
        { key: 'mean', label: 'Mean', numeric: true },
        { key: 'p50', label: 'p50', numeric: true },
        { key: 'p90', label: 'p90', numeric: true },
        { key: 'p99', label: 'p99', numeric: true },
        { key: 'p999', label: 'p99.9', numeric: true },
        { key: 'n', label: 'Samples', numeric: true },
      ]}
      rows={ENGINES.map(engine => {
        const row = latency[engine];
        return {
          engine: LABEL[engine],
          mean: row.mean_micros.toFixed(1),
          p50: row.p50_micros.toFixed(1),
          p90: row.p90_micros.toFixed(1),
          p99: row.p99_micros.toFixed(1),
          p999: row.p99_9_micros.toFixed(1),
          n: num(row.sample_count),
          highlight: engine === 'simdjson-jni-direct',
        };
      })}
    />

    <p>
      The p99 falls from {latency['jackson-stream'].p99_micros.toFixed(0)} µs to{' '}
      {latency['simdjson-jni-direct'].p99_micros.toFixed(0)} µs, a factor of{' '}
      {(latency['jackson-stream'].p99_micros / latency['simdjson-jni-direct'].p99_micros).toFixed(1)},
      and p99.9 improves by a similar factor. That much is expected.
    </p>

    <Note label="A claim that did not survive contact">
      <p>
        I expected the distribution to get tighter as well as faster, on the reasoning that the native
        path allocates nothing and therefore cannot be interrupted by a collection mid-parse. The
        ratio of p99 to p50 says otherwise:{' '}
        {(latency['jackson-stream'].p99_micros / latency['jackson-stream'].p50_micros).toFixed(2)} for
        Jackson streaming against{' '}
        {(latency['simdjson-jni-direct'].p99_micros / latency['simdjson-jni-direct'].p50_micros).toFixed(2)}{' '}
        for the zero-copy path. The relative spread is essentially unchanged.
      </p>
      <p>
        Everything got faster, including the tail, in proportion. Predictability did not improve. The
        remaining variance is evidently not dominated by allocation, which leaves scheduling,
        frequency and cache effects as the likely sources. I have not chased it further, and I would
        rather report the null result than the intuition.
      </p>
    </Note>

    <H2 id="pipeline">Where the time goes afterwards</H2>
    <p>
      The reason to make parsing faster is to stop it being the bottleneck. The natural follow-up is
      whether it worked, which requires measuring stage shares rather than drawing a flamegraph and
      eyeballing it. The harness benchmarks three variants of the same pipeline over the real vehicle
      feed, scanning only, scanning and mapping to typed records, and the full pipeline including
      validation, then differences them.
    </p>

    <Table
      n={5}
      caption={
        <>
          Stage shares of the full ingestion pipeline over a {num(SUM.E_pipeline_share.batch_records)}
          -record batch of real EPA vehicle records. The scan stage is not the same kind of work in
          both families, since Jackson must tokenise before any field can be read while simdjson On
          Demand fuses scanning with extraction, so the full-pipeline totals are the comparable
          numbers.
        </>
      }
      columns={[
        { key: 'engine', label: 'Engine' },
        { key: 'full', label: 'Full pipeline', numeric: true },
        { key: 'parse', label: 'Parse', numeric: true },
        { key: 'map', label: 'Map', numeric: true },
        { key: 'validate', label: 'Validate', numeric: true },
        { key: 'mbps', label: 'MB/s', numeric: true },
      ]}
      rows={Object.keys(pipeline).map(engine => {
        const row = pipeline[engine];
        const share = row.stage_share_of_full;
        return {
          engine: LABEL[engine],
          full: `${(row.measured_variants_micros.full.mean_micros / 1000).toFixed(1)} ms`,
          parse: pct(share.parse_scan),
          map: pct(share.map_to_listing),
          validate: pct(share.validate),
          mbps: mb(row.full_pipeline_mb_per_second),
          highlight: engine === 'simdjson-jni-direct',
        };
      })}
    />

    <p>
      The pipeline breakdown is where the change shows up. With Jackson's tree parser, parsing is{' '}
      {pct(pipeline['jackson-tree'].stage_share_of_full.parse_scan, 0)} of the pipeline and nothing
      else is worth optimising. With the zero-copy native path it is{' '}
      {pct(pipeline['simdjson-jni-direct'].stage_share_of_full.parse_scan, 0)}, and mapping into typed
      records has become the larger share at{' '}
      {pct(pipeline['simdjson-jni-direct'].stage_share_of_full.map_to_listing, 0)}. The bottleneck
      moved. Full-pipeline throughput goes from{' '}
      {mb(pipeline['jackson-tree'].full_pipeline_mb_per_second)} MB/s to{' '}
      {mb(pipeline['simdjson-jni-direct'].full_pipeline_mb_per_second)} MB/s, which is a smaller
      factor than the parse-only speedup precisely because the parse is no longer what you are paying
      for.
    </p>

    <H2 id="scaling">Scaling</H2>

    <Figure
      n={4}
      caption={
        <>
          Throughput at 1, 2, 4, 8 and 16 threads on the fixed NDJSON batch. All four engines scale
          close to linearly on this machine, which has {ENV.toolchain['cpu.logical']} logical cores, so
          nothing here is contending on a shared lock. The native engines start higher and stay higher.
        </>
      }
    >
      <GroupedBarChart
        title="Throughput by thread count"
        sub="MB/s on the 256-record NDJSON batch"
        unit="MB/s"
        groups={THREADS.map(t => `${t} thread${t === '1' ? '' : 's'}`)}
        series={[
          { key: 'jackson-stream', label: 'Jackson streaming' },
          { key: 'simdjson-jni-direct', label: 'simdjson zero-copy' },
        ].map(series => {
          const values = THREADS.map(t => scaling[series.key][t].mb_per_second);
          return {
            label: series.label,
            values,
            displays: values.map(v => mb(v)),
          };
        })}
      />
    </Figure>

    <p>
      At 16 threads the zero-copy path reaches{' '}
      {(scaling['simdjson-jni-direct']['16'].mb_per_second / 1000).toFixed(1)} GB/s against{' '}
      {(scaling['jackson-stream']['16'].mb_per_second / 1000).toFixed(1)} GB/s for Jackson streaming,
      with scaling factors of {scaling['simdjson-jni-direct']['16'].scaling_vs_1_thread.toFixed(1)} and{' '}
      {scaling['jackson-stream']['16'].scaling_vs_1_thread.toFixed(1)} respectively. The thread-local
      parser in the native bridge does what it is supposed to, and the JNI boundary introduces no
      shared serialisation point.
    </p>

    <H2 id="limits">What this does not show</H2>
    <p>
      One machine, one JVM, one compiler. The numbers are from a{' '}
      {ENV.toolchain['cpu.brand']} running simdjson's{' '}
      {ENV.simdjson.active_implementation} kernel. An arm64 machine takes the NEON path and will
      produce different ratios, and I would expect the zero-copy premium in particular to move, since
      it depends on the ratio of memcpy bandwidth to parse bandwidth.
    </p>
    <p>
      The native build uses <code>-march=native</code> while the JVM gets no equivalent tuning. This
      is realistic, since you would compile a native artifact for your fleet, and it is also a real
      advantage that should be stated rather than buried.
    </p>
    <p>
      Only the parse and a simple field extraction cross the boundary. A design that returns rich
      object graphs across JNI would look very different, and the{' '}
      {crossingNanos.toFixed(0)} ns crossing cost is what would make it different.
    </p>
    <p>
      Finally, JNI adds operational weight that no benchmark captures. You ship and debug a native
      artifact per platform, malformed input has to become a Java exception rather than a segfault,
      and native document handles need disciplined lifetime management. For a path that is{' '}
      {pct(pipeline['jackson-tree'].stage_share_of_full.parse_scan, 0)} of your pipeline, that trade
      is easy. For a parser that is five percent of it, it is not.
    </p>

    <References refs={SIMD_REFS} bibtex={SIMD_BIBTEX} />
  </Article>
);

export default BlogSimdjson;
