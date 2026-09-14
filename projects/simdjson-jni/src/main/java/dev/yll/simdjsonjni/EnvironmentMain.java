package dev.yll.simdjsonjni;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class EnvironmentMain {

  private static final int[] PROBE_SIZES = {16, 1024, 65536, 1048576, 8388608};

  private EnvironmentMain() {}

  public static void main(String[] args) throws IOException {
    Path output = Path.of(args.length > 0 ? args[0] : "results/environment.json");

    Map<String, Object> jvm = new LinkedHashMap<>();
    for (String key : List.of(
        "java.runtime.version",
        "java.vm.name",
        "java.vm.version",
        "java.vm.vendor",
        "java.vendor",
        "java.vendor.version",
        "os.name",
        "os.version",
        "os.arch")) {
      jvm.put(key, System.getProperty(key));
    }
    jvm.put("available_processors", Runtime.getRuntime().availableProcessors());
    jvm.put("max_heap_bytes", Runtime.getRuntime().maxMemory());
    jvm.put("input_arguments", ManagementFactory.getRuntimeMXBean().getInputArguments());

    Map<String, Object> simdjson = new LinkedHashMap<>();
    simdjson.put("version", SimdJson.version());
    simdjson.put("active_implementation", SimdJson.activeImplementation());
    simdjson.put("padding_bytes", SimdJson.padding());

    Map<String, Object> jni = new LinkedHashMap<>();
    Map<String, Object> isCopy = new LinkedHashMap<>();
    for (int size : PROBE_SIZES) {
      isCopy.put(String.valueOf(size), SimdJson.byteArrayIsCopy(new byte[size]));
    }
    jni.put("get_byte_array_elements_is_copy", isCopy);

    List<Map<String, Object>> datasets = new ArrayList<>();
    for (String name : Datasets.CORPUS) {
      datasets.add(describe(Datasets.corpus(name), "single-document"));
    }
    datasets.add(describe(Datasets.latencyBatch(), "ndjson-stream"));
    datasets.add(describe(Datasets.pipelineBatch(), "ndjson-stream"));

    Map<String, Object> toolchain = new LinkedHashMap<>();
    for (String key : List.of(
        "bench.cxx.version",
        "bench.cmake.version",
        "bench.maven.version",
        "bench.python.version",
        "bench.cpu.brand",
        "bench.cpu.logical",
        "bench.cpu.performance_cores",
        "bench.cpu.efficiency_cores",
        "bench.os.build",
        "bench.native.tuning_flag",
        "bench.jmh.version",
        "bench.jackson.version",
        "bench.jvm.flags")) {
      toolchain.put(key.replace("bench.", ""), System.getProperty(key, "unrecorded"));
    }

    Map<String, Object> report = new LinkedHashMap<>();
    report.put("jvm", jvm);
    report.put("simdjson", simdjson);
    report.put("jni", jni);
    report.put("toolchain", toolchain);
    report.put("datasets", datasets);
    report.put("latency_batch_records", Datasets.LATENCY_BATCH_RECORDS);
    report.put("pipeline_batch_records", Datasets.PIPELINE_BATCH_RECORDS);

    Files.createDirectories(output.toAbsolutePath().getParent());
    Files.writeString(output, Json.write(report) + "\n", StandardCharsets.UTF_8);
    System.out.println("wrote " + output.toAbsolutePath());
  }

  private static Map<String, Object> describe(JsonPayload payload, String mode) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("name", payload.name());
    row.put("mode", mode);
    row.put("bytes", payload.length());
    row.put("sha256", payload.sha256());
    return row;
  }
}
