package dev.yll.simdjsonjni;

public final class JsonChecksum {

  public static final long SEED = 0xcbf29ce484222325L;
  public static final long PRIME = 0x100000001b3L;

  public static final long TAG_OBJECT_BEGIN = 1L;
  public static final long TAG_OBJECT_END = 2L;
  public static final long TAG_ARRAY_BEGIN = 3L;
  public static final long TAG_ARRAY_END = 4L;
  public static final long TAG_KEY = 5L;
  public static final long TAG_STRING = 6L;
  public static final long TAG_INT = 7L;
  public static final long TAG_DOUBLE = 8L;
  public static final long TAG_BOOLEAN = 9L;
  public static final long TAG_NULL = 10L;
  public static final long TAG_DOCUMENT_END = 11L;

  private JsonChecksum() {}

  public static long mix(long accumulator, long value) {
    return (accumulator ^ value) * PRIME;
  }

  public static int utf8Length(String text) {
    int limit = text.length();
    int bytes = 0;
    for (int i = 0; i < limit; i++) {
      char c = text.charAt(i);
      if (c < 0x80) {
        bytes += 1;
      } else if (c < 0x800) {
        bytes += 2;
      } else if (Character.isHighSurrogate(c) && i + 1 < limit
          && Character.isLowSurrogate(text.charAt(i + 1))) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    }
    return bytes;
  }

  public static int utf8Length(char[] buffer, int offset, int length) {
    int limit = offset + length;
    int bytes = 0;
    for (int i = offset; i < limit; i++) {
      char c = buffer[i];
      if (c < 0x80) {
        bytes += 1;
      } else if (c < 0x800) {
        bytes += 2;
      } else if (Character.isHighSurrogate(c) && i + 1 < limit
          && Character.isLowSurrogate(buffer[i + 1])) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    }
    return bytes;
  }
}
