package dev.yll.simdjsonjni;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public final class JacksonStreamPipeline implements IngestPipeline {

  private final JsonFactory factory = new JsonFactory();

  @Override
  public String name() {
    return "jackson-stream";
  }

  @Override
  public long scan(JsonPayload payload) {
    long tokens = 0;
    try (JsonParser parser = factory.createParser(payload.heapBytes(), 0, payload.length())) {
      while (parser.nextToken() != null) {
        tokens++;
      }
      return tokens;
    } catch (IOException e) {
      throw new IllegalStateException("jackson-stream scan failed", e);
    }
  }

  @Override
  public List<Listing> extract(JsonPayload payload) {
    List<Listing> listings = new ArrayList<>(Datasets.PIPELINE_BATCH_RECORDS);
    try (JsonParser parser = factory.createParser(payload.heapBytes(), 0, payload.length())) {
      while (parser.nextToken() != null) {
        listings.add(readListing(parser));
      }
      return listings;
    } catch (IOException e) {
      throw new IllegalStateException("jackson-stream extract failed", e);
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

  private static Listing readListing(JsonParser parser) throws IOException {
    String make = "";
    String model = "";
    String fuelType = "";
    int year = 0;
    int city = 0;
    int highway = 0;
    int combined = 0;
    double co2 = Double.NaN;

    while (parser.nextToken() == JsonToken.FIELD_NAME) {
      String field = parser.currentName();
      parser.nextToken();
      switch (field) {
        case "make" -> make = parser.getText();
        case "model" -> model = parser.getText();
        case "fuelType" -> fuelType = parser.getText();
        case "year" -> year = parser.getIntValue();
        case "city08" -> city = parser.getIntValue();
        case "highway08" -> highway = parser.getIntValue();
        case "comb08" -> combined = parser.getIntValue();
        case "co2TailpipeGpm" -> co2 = parser.getDoubleValue();
        default -> parser.skipChildren();
      }
    }
    return new Listing(make, model, year, city, highway, combined, co2, fuelType);
  }
}
