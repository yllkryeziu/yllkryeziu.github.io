package dev.yll.simdjsonjni;

import java.util.List;

public interface IngestPipeline {

  String name();

  long scan(JsonPayload payload);

  List<Listing> extract(JsonPayload payload);

  long validate(JsonPayload payload);
}
