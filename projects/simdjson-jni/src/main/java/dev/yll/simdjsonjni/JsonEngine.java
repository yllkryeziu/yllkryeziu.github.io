package dev.yll.simdjsonjni;

public interface JsonEngine {

  String name();

  long checksum(JsonPayload payload);

  long checksumStream(JsonPayload payload);
}
