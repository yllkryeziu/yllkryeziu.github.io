package dev.yll.simdjsonjni;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public final class SimdJsonDirectPipeline implements IngestPipeline {

  private static final int RECORD_BYTES = 48;
  private static final int OFFSET_YEAR = 0;
  private static final int OFFSET_CITY = 4;
  private static final int OFFSET_HIGHWAY = 8;
  private static final int OFFSET_COMBINED = 12;
  private static final int OFFSET_CO2 = 16;
  private static final int OFFSET_MAKE = 24;
  private static final int OFFSET_MODEL = 32;
  private static final int OFFSET_FUEL = 40;
  private static final int STRING_BYTES_PER_RECORD = 512;
  private static final int SCRATCH_BYTES = 4096;

  private final int maxRecords;
  private final ByteBuffer records;
  private final ByteBuffer strings;
  private final byte[] scratch = new byte[SCRATCH_BYTES];

  public SimdJsonDirectPipeline(int maxRecords) {
    this.maxRecords = maxRecords;
    this.records = ByteBuffer.allocateDirect(maxRecords * RECORD_BYTES)
        .order(ByteOrder.nativeOrder());
    this.strings = ByteBuffer.allocateDirect(maxRecords * STRING_BYTES_PER_RECORD)
        .order(ByteOrder.nativeOrder());
  }

  public int maxRecords() {
    return maxRecords;
  }

  @Override
  public String name() {
    return "simdjson-jni-direct";
  }

  @Override
  public long scan(JsonPayload payload) {
    return SimdJson.countDocumentsDirect(payload.directBytes(), payload.length());
  }

  @Override
  public List<Listing> extract(JsonPayload payload) {
    int count = SimdJson.extractListingsDirect(
        payload.directBytes(),
        payload.length(),
        records,
        records.capacity(),
        strings,
        strings.capacity());
    List<Listing> listings = new ArrayList<>(count);
    for (int index = 0; index < count; index++) {
      int base = index * RECORD_BYTES;
      listings.add(new Listing(
          readString(base + OFFSET_MAKE),
          readString(base + OFFSET_MODEL),
          records.getInt(base + OFFSET_YEAR),
          records.getInt(base + OFFSET_CITY),
          records.getInt(base + OFFSET_HIGHWAY),
          records.getInt(base + OFFSET_COMBINED),
          records.getDouble(base + OFFSET_CO2),
          readString(base + OFFSET_FUEL)));
    }
    return listings;
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

  private String readString(int slot) {
    int offset = records.getInt(slot);
    int length = records.getInt(slot + 4);
    if (length <= 0) {
      return "";
    }
    if (length > SCRATCH_BYTES) {
      throw new SimdJsonException("extracted string exceeds scratch buffer: " + length);
    }
    strings.get(offset, scratch, 0, length);
    return new String(scratch, 0, length, StandardCharsets.UTF_8);
  }
}
