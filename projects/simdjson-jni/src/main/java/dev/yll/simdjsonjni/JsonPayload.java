package dev.yll.simdjsonjni;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class JsonPayload {

  private final String name;
  private final int length;
  private final byte[] heapBytes;
  private final ByteBuffer directBytes;
  private final String sha256;

  private JsonPayload(String name, byte[] content) {
    int padding = SimdJson.padding();
    this.name = name;
    this.length = content.length;
    this.heapBytes = new byte[content.length + padding];
    System.arraycopy(content, 0, this.heapBytes, 0, content.length);
    this.directBytes = ByteBuffer.allocateDirect(content.length + padding)
        .order(ByteOrder.nativeOrder());
    this.directBytes.put(content, 0, content.length);
    this.directBytes.clear();
    this.sha256 = digest(content);
  }

  public static JsonPayload ofFile(Path path) throws IOException {
    return new JsonPayload(path.getFileName().toString(), Files.readAllBytes(path));
  }

  public static JsonPayload ofBytes(String name, byte[] content) {
    return new JsonPayload(name, content);
  }

  public static JsonPayload ofLinePrefix(String name, Path path, int lineCount) throws IOException {
    byte[] all = Files.readAllBytes(path);
    int seen = 0;
    int end = 0;
    while (end < all.length && seen < lineCount) {
      if (all[end] == '\n') {
        seen++;
      }
      end++;
    }
    if (seen < lineCount) {
      throw new IllegalArgumentException(path + " has fewer than " + lineCount + " lines");
    }
    byte[] slice = new byte[end];
    System.arraycopy(all, 0, slice, 0, end);
    return new JsonPayload(name, slice);
  }

  private static String digest(byte[] content) {
    try {
      MessageDigest sha = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(sha.digest(content));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  public String name() {
    return name;
  }

  public int length() {
    return length;
  }

  public byte[] heapBytes() {
    return heapBytes;
  }

  public ByteBuffer directBytes() {
    return directBytes;
  }

  public String sha256() {
    return sha256;
  }
}
