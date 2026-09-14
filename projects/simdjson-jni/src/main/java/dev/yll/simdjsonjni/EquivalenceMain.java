package dev.yll.simdjsonjni;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class EquivalenceMain {

  private EquivalenceMain() {}

  public static void main(String[] args) throws IOException {
    Path output = Path.of(args.length > 0 ? args[0] : "results/equivalence.json");
    List<JsonEngine> engines = Datasets.engines();
    List<Map<String, Object>> rows = new ArrayList<>();
    int mismatches = 0;

    for (String name : Datasets.CORPUS) {
      JsonPayload payload = Datasets.corpus(name);
      Map<String, Object> row = compare(engines, payload, false);
      rows.add(row);
      if (Boolean.FALSE.equals(row.get("agree"))) {
        mismatches++;
      }
    }

    for (JsonPayload payload : List.of(Datasets.latencyBatch(), Datasets.pipelineBatch())) {
      Map<String, Object> row = compare(engines, payload, true);
      rows.add(row);
      if (Boolean.FALSE.equals(row.get("agree"))) {
        mismatches++;
      }
    }

    Map<String, Object> pipelineReport = comparePipelines(Datasets.pipelineBatch());
    if (Boolean.FALSE.equals(pipelineReport.get("agree"))) {
      mismatches++;
    }

    Map<String, Object> report = new LinkedHashMap<>();
    report.put("simdjson_version", SimdJson.version());
    report.put("simdjson_active_implementation", SimdJson.activeImplementation());
    report.put("simdjson_padding_bytes", SimdJson.padding());
    report.put("engines", engines.stream().map(JsonEngine::name).toList());
    report.put("mismatches", mismatches);
    report.put("datasets", rows);
    report.put("pipeline", pipelineReport);

    Files.createDirectories(output.toAbsolutePath().getParent());
    Files.writeString(output, Json.write(report) + "\n", StandardCharsets.UTF_8);

    for (Map<String, Object> row : rows) {
      System.out.printf("%-28s %12s bytes  checksum=%s  agree=%s%n",
          row.get("dataset"), row.get("bytes"), row.get("checksum"), row.get("agree"));
    }
    System.out.println("pipeline agree=" + pipelineReport.get("agree")
        + " valid=" + pipelineReport.get("valid_listings")
        + " of " + pipelineReport.get("listings"));
    System.out.println("mismatches=" + mismatches);
    if (mismatches > 0) {
      throw new IllegalStateException("engine checksums disagree; benchmark is invalid");
    }
  }

  private static Map<String, Object> compare(
      List<JsonEngine> engines, JsonPayload payload, boolean stream) {
    Map<String, Object> perEngine = new LinkedHashMap<>();
    Long reference = null;
    boolean agree = true;
    for (JsonEngine engine : engines) {
      long value = stream ? engine.checksumStream(payload) : engine.checksum(payload);
      perEngine.put(engine.name(), hex(value));
      if (reference == null) {
        reference = value;
      } else if (reference != value) {
        agree = false;
      }
    }
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("dataset", payload.name());
    row.put("mode", stream ? "ndjson-stream" : "single-document");
    row.put("bytes", payload.length());
    row.put("sha256", payload.sha256());
    row.put("checksum", hex(reference == null ? 0L : reference));
    row.put("agree", agree);
    row.put("per_engine", perEngine);
    return row;
  }

  private static Map<String, Object> comparePipelines(JsonPayload payload) {
    List<IngestPipeline> pipelines = List.of(
        new JacksonTreePipeline(),
        new JacksonStreamPipeline(),
        new SimdJsonDirectPipeline(Datasets.PIPELINE_BATCH_RECORDS));

    List<Listing> reference = null;
    long referenceValid = -1;
    boolean agree = true;
    Map<String, Object> perPipeline = new LinkedHashMap<>();
    for (IngestPipeline pipeline : pipelines) {
      List<Listing> listings = pipeline.extract(payload);
      long valid = pipeline.validate(payload);
      long scanned = pipeline.scan(payload);
      Map<String, Object> detail = new LinkedHashMap<>();
      detail.put("listings", listings.size());
      detail.put("valid_listings", valid);
      detail.put("scan_result", scanned);
      perPipeline.put(pipeline.name(), detail);
      if (reference == null) {
        reference = listings;
        referenceValid = valid;
      } else if (!reference.equals(listings) || referenceValid != valid) {
        agree = false;
      }
    }

    Map<String, Object> row = new LinkedHashMap<>();
    row.put("dataset", payload.name());
    row.put("bytes", payload.length());
    row.put("listings", reference == null ? 0 : reference.size());
    row.put("valid_listings", referenceValid);
    row.put("agree", agree);
    row.put("per_pipeline", perPipeline);
    return row;
  }

  private static String hex(long value) {
    return String.format("0x%016x", value);
  }
}
