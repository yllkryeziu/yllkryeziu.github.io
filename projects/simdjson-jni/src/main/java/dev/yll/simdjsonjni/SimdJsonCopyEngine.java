package dev.yll.simdjsonjni;

public final class SimdJsonCopyEngine implements JsonEngine {

  @Override
  public String name() {
    return "simdjson-jni-copy";
  }

  @Override
  public long checksum(JsonPayload payload) {
    return SimdJson.checksumArray(payload.heapBytes(), payload.length());
  }

  @Override
  public long checksumStream(JsonPayload payload) {
    return SimdJson.checksumStreamArray(payload.heapBytes(), payload.length());
  }
}
