package dev.yll.simdjsonjni;

public final class SimdJsonDirectEngine implements JsonEngine {

  @Override
  public String name() {
    return "simdjson-jni-direct";
  }

  @Override
  public long checksum(JsonPayload payload) {
    return SimdJson.checksumDirect(payload.directBytes(), payload.length());
  }

  @Override
  public long checksumStream(JsonPayload payload) {
    return SimdJson.checksumStreamDirect(payload.directBytes(), payload.length());
  }
}
