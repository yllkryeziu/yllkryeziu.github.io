package dev.yll.simdjsonjni;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public final class JacksonTreePipeline implements IngestPipeline {

  private final ObjectMapper mapper = new ObjectMapper();

  @Override
  public String name() {
    return "jackson-tree";
  }

  @Override
  public long scan(JsonPayload payload) {
    long documents = 0;
    try (JsonParser parser =
        mapper.getFactory().createParser(payload.heapBytes(), 0, payload.length())) {
      while (true) {
        JsonNode root = mapper.readTree(parser);
        if (root == null) {
          return documents;
        }
        documents += root.size();
      }
    } catch (IOException e) {
      throw new IllegalStateException("jackson-tree scan failed", e);
    }
  }

  @Override
  public List<Listing> extract(JsonPayload payload) {
    List<Listing> listings = new ArrayList<>(Datasets.PIPELINE_BATCH_RECORDS);
    try (JsonParser parser =
        mapper.getFactory().createParser(payload.heapBytes(), 0, payload.length())) {
      while (true) {
        JsonNode root = mapper.readTree(parser);
        if (root == null) {
          return listings;
        }
        listings.add(new Listing(
            root.path("make").asText(),
            root.path("model").asText(),
            root.path("year").asInt(),
            root.path("city08").asInt(),
            root.path("highway08").asInt(),
            root.path("comb08").asInt(),
            root.path("co2TailpipeGpm").asDouble(),
            root.path("fuelType").asText()));
      }
    } catch (IOException e) {
      throw new IllegalStateException("jackson-tree extract failed", e);
    }
  }

  @Override
  public long validate(JsonPayload payload) {
    long valid = 0;
    for (Listing listing : extract(payload)) {
      if (listing.isValid()) {
        valid++;
      }
    }
    return valid;
  }
}
