package dev.yll.simdjsonjni.bench;

import dev.yll.simdjsonjni.Datasets;
import dev.yll.simdjsonjni.JsonEngine;
import dev.yll.simdjsonjni.JsonPayload;
import java.util.concurrent.TimeUnit;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Fork;
import org.openjdk.jmh.annotations.Level;
import org.openjdk.jmh.annotations.Measurement;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.Setup;
import org.openjdk.jmh.annotations.State;
import org.openjdk.jmh.annotations.Threads;
import org.openjdk.jmh.annotations.Warmup;

@BenchmarkMode(Mode.SampleTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
@Fork(3)
@Warmup(iterations = 5, time = 2, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 10, time = 2, timeUnit = TimeUnit.SECONDS)
@Threads(1)
public class LatencyBenchmark {

  @Param({"jackson-tree", "jackson-stream", "simdjson-jni-copy", "simdjson-jni-direct"})
  public String engine;

  private JsonPayload payload;
  private JsonEngine jsonEngine;

  @Setup(Level.Trial)
  public void setup() {
    payload = Datasets.latencyBatch();
    jsonEngine = Datasets.engineByName(engine);
  }

  @Benchmark
  public long checksumBatch() {
    return jsonEngine.checksumStream(payload);
  }
}
