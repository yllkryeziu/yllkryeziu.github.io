package dev.yll.simdjsonjni.bench;

import dev.yll.simdjsonjni.SimdJson;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
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

@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
@Fork(3)
@Warmup(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 10, time = 1, timeUnit = TimeUnit.SECONDS)
@Threads(1)
public class JniTransferBenchmark {

  @Param({"1024", "65536", "1048576", "8388608"})
  public int bytes;

  private ByteBuffer direct;
  private byte[] heap;

  @Setup(Level.Trial)
  public void setup() {
    int padding = SimdJson.padding();
    direct = ByteBuffer.allocateDirect(bytes + padding).order(ByteOrder.nativeOrder());
    heap = new byte[bytes + padding];
    for (int i = 0; i < bytes; i++) {
      byte value = (byte) (i * 31);
      direct.put(i, value);
      heap[i] = value;
    }
  }

  @Benchmark
  public long touchDirect() {
    return SimdJson.touchDirect(direct, bytes);
  }

  @Benchmark
  public long touchArray() {
    return SimdJson.touchArray(heap, bytes);
  }
}
