package dev.yll.simdjsonjni;

import java.nio.ByteBuffer;
import java.nio.file.Path;

public final class SimdJson {

  private static final String LIBRARY_PROPERTY = "simdjson.jni.library";

  static {
    String explicit = System.getProperty(LIBRARY_PROPERTY);
    if (explicit != null && !explicit.isEmpty()) {
      System.load(Path.of(explicit).toAbsolutePath().toString());
    } else {
      System.loadLibrary("simdjson_jni");
    }
  }

  private SimdJson() {}

  public static native int padding();

  public static native String version();

  public static native String activeImplementation();

  public static native void noop();

  public static native long touchDirect(ByteBuffer buffer, int length);

  public static native long touchArray(byte[] buffer, int length);

  public static native boolean byteArrayIsCopy(byte[] buffer);

  public static native long checksumDirect(ByteBuffer buffer, int length);

  public static native long checksumArray(byte[] buffer, int length);

  public static native long checksumStreamDirect(ByteBuffer buffer, int length);

  public static native long checksumStreamArray(byte[] buffer, int length);

  public static native long countDocumentsDirect(ByteBuffer buffer, int length);

  public static native int extractListingsDirect(
      ByteBuffer input,
      int inputLength,
      ByteBuffer records,
      int recordCapacity,
      ByteBuffer strings,
      int stringCapacity);

  public static void touch() {}
}
