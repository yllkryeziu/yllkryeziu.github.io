package dev.yll.simdjsonjni;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

public final class Datasets {

  public static final List<String> CORPUS = List.of(
      "twitter.json",
      "twitterescaped.json",
      "github_events.json",
      "citm_catalog.json",
      "canada.json",
      "gsoc-2018.json",
      "marine_ik.json",
      "mesh.json",
      "update-center.json",
      "vpic_makes.json");

  public static final String FEED = "vehicles.ndjson";
  public static final int LATENCY_BATCH_RECORDS = 256;
  public static final int PIPELINE_BATCH_RECORDS = 4096;

  private Datasets() {}

  public static Path directory() {
    return Path.of(System.getProperty("simdjson.data.dir", "data")).toAbsolutePath();
  }

  public static JsonPayload corpus(String name) {
    try {
      return JsonPayload.ofFile(directory().resolve(name));
    } catch (IOException e) {
      throw new IllegalStateException("cannot load corpus file " + name, e);
    }
  }

  public static JsonPayload latencyBatch() {
    return feedBatch("vehicles-latency-batch", LATENCY_BATCH_RECORDS);
  }

  public static JsonPayload pipelineBatch() {
    return feedBatch("vehicles-pipeline-batch", PIPELINE_BATCH_RECORDS);
  }

  public static JsonPayload feedBatch(String name, int records) {
    try {
      return JsonPayload.ofLinePrefix(name, directory().resolve(FEED), records);
    } catch (IOException e) {
      throw new IllegalStateException("cannot load feed batch " + name, e);
    }
  }

  public static JsonEngine engineByName(String name) {
    for (JsonEngine engine : engines()) {
      if (engine.name().equals(name)) {
        return engine;
      }
    }
    throw new IllegalArgumentException("unknown engine " + name);
  }

  public static IngestPipeline pipelineByName(String name) {
    return switch (name) {
      case "jackson-tree" -> new JacksonTreePipeline();
      case "jackson-stream" -> new JacksonStreamPipeline();
      case "simdjson-jni-direct" -> new SimdJsonDirectPipeline(PIPELINE_BATCH_RECORDS);
      default -> throw new IllegalArgumentException("unknown pipeline " + name);
    };
  }

  public static List<JsonEngine> engines() {
    return List.of(
        new JacksonTreeEngine(),
        new JacksonStreamEngine(),
        new SimdJsonCopyEngine(),
        new SimdJsonDirectEngine());
  }
}
