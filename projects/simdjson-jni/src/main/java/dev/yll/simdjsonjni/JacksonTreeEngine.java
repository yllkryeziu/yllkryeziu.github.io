package dev.yll.simdjsonjni;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Iterator;
import java.util.Map;

public final class JacksonTreeEngine implements JsonEngine {

  private final ObjectMapper mapper = new ObjectMapper();

  @Override
  public String name() {
    return "jackson-tree";
  }

  @Override
  public long checksum(JsonPayload payload) {
    try {
      JsonNode root = mapper.readTree(payload.heapBytes(), 0, payload.length());
      return walk(root, JsonChecksum.SEED);
    } catch (IOException e) {
      throw new IllegalStateException("jackson-tree failed on " + payload.name(), e);
    }
  }

  @Override
  public long checksumStream(JsonPayload payload) {
    long accumulator = JsonChecksum.SEED;
    try (JsonParser parser =
        mapper.getFactory().createParser(payload.heapBytes(), 0, payload.length())) {
      while (true) {
        JsonNode root = mapper.readTree(parser);
        if (root == null) {
          return accumulator;
        }
        accumulator = walk(root, accumulator);
        accumulator = JsonChecksum.mix(accumulator, JsonChecksum.TAG_DOCUMENT_END);
      }
    } catch (IOException e) {
      throw new IllegalStateException("jackson-tree failed on " + payload.name(), e);
    }
  }

  private static long walk(JsonNode node, long accumulator) {
    switch (node.getNodeType()) {
      case OBJECT: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_OBJECT_BEGIN);
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
          Map.Entry<String, JsonNode> field = fields.next();
          hash = JsonChecksum.mix(hash, JsonChecksum.TAG_KEY);
          hash = JsonChecksum.mix(hash, JsonChecksum.utf8Length(field.getKey()));
          hash = walk(field.getValue(), hash);
        }
        return JsonChecksum.mix(hash, JsonChecksum.TAG_OBJECT_END);
      }
      case ARRAY: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_ARRAY_BEGIN);
        for (JsonNode child : node) {
          hash = walk(child, hash);
        }
        return JsonChecksum.mix(hash, JsonChecksum.TAG_ARRAY_END);
      }
      case STRING: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_STRING);
        return JsonChecksum.mix(hash, JsonChecksum.utf8Length(node.textValue()));
      }
      case NUMBER: {
        if (node.isIntegralNumber() && node.canConvertToLong()) {
          long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_INT);
          return JsonChecksum.mix(hash, node.longValue());
        }
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_DOUBLE);
        return JsonChecksum.mix(hash, Double.doubleToRawLongBits(node.doubleValue()));
      }
      case BOOLEAN: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_BOOLEAN);
        return JsonChecksum.mix(hash, node.booleanValue() ? 1L : 0L);
      }
      case NULL:
        return JsonChecksum.mix(accumulator, JsonChecksum.TAG_NULL);
      default:
        throw new IllegalStateException("unsupported node type " + node.getNodeType());
    }
  }
}
