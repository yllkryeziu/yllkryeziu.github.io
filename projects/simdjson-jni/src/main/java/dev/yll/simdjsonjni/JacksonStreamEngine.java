package dev.yll.simdjsonjni;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import java.io.IOException;

public final class JacksonStreamEngine implements JsonEngine {

  private final JsonFactory factory = new JsonFactory();

  @Override
  public String name() {
    return "jackson-stream";
  }

  @Override
  public long checksum(JsonPayload payload) {
    try (JsonParser parser = factory.createParser(payload.heapBytes(), 0, payload.length())) {
      parser.nextToken();
      return walkValue(parser, JsonChecksum.SEED);
    } catch (IOException e) {
      throw new IllegalStateException("jackson-stream failed on " + payload.name(), e);
    }
  }

  @Override
  public long checksumStream(JsonPayload payload) {
    long accumulator = JsonChecksum.SEED;
    try (JsonParser parser = factory.createParser(payload.heapBytes(), 0, payload.length())) {
      while (parser.nextToken() != null) {
        accumulator = walkValue(parser, accumulator);
        accumulator = JsonChecksum.mix(accumulator, JsonChecksum.TAG_DOCUMENT_END);
      }
      return accumulator;
    } catch (IOException e) {
      throw new IllegalStateException("jackson-stream failed on " + payload.name(), e);
    }
  }

  private static long walkValue(JsonParser parser, long accumulator) throws IOException {
    JsonToken token = parser.currentToken();
    switch (token) {
      case START_OBJECT: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_OBJECT_BEGIN);
        while (parser.nextToken() == JsonToken.FIELD_NAME) {
          hash = JsonChecksum.mix(hash, JsonChecksum.TAG_KEY);
          hash = JsonChecksum.mix(hash, textUtf8Length(parser));
          parser.nextToken();
          hash = walkValue(parser, hash);
        }
        return JsonChecksum.mix(hash, JsonChecksum.TAG_OBJECT_END);
      }
      case START_ARRAY: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_ARRAY_BEGIN);
        while (parser.nextToken() != JsonToken.END_ARRAY) {
          hash = walkValue(parser, hash);
        }
        return JsonChecksum.mix(hash, JsonChecksum.TAG_ARRAY_END);
      }
      case VALUE_STRING: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_STRING);
        return JsonChecksum.mix(hash, textUtf8Length(parser));
      }
      case VALUE_NUMBER_INT: {
        if (parser.getNumberType() == JsonParser.NumberType.BIG_INTEGER) {
          long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_DOUBLE);
          return JsonChecksum.mix(hash, Double.doubleToRawLongBits(parser.getDoubleValue()));
        }
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_INT);
        return JsonChecksum.mix(hash, parser.getLongValue());
      }
      case VALUE_NUMBER_FLOAT: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_DOUBLE);
        return JsonChecksum.mix(hash, Double.doubleToRawLongBits(parser.getDoubleValue()));
      }
      case VALUE_TRUE: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_BOOLEAN);
        return JsonChecksum.mix(hash, 1L);
      }
      case VALUE_FALSE: {
        long hash = JsonChecksum.mix(accumulator, JsonChecksum.TAG_BOOLEAN);
        return JsonChecksum.mix(hash, 0L);
      }
      case VALUE_NULL:
        return JsonChecksum.mix(accumulator, JsonChecksum.TAG_NULL);
      default:
        throw new IllegalStateException("unexpected token " + token);
    }
  }

  private static int textUtf8Length(JsonParser parser) throws IOException {
    return JsonChecksum.utf8Length(
        parser.getTextCharacters(), parser.getTextOffset(), parser.getTextLength());
  }
}
