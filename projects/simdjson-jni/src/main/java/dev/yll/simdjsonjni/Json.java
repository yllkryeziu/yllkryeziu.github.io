package dev.yll.simdjsonjni;

import java.util.Collection;
import java.util.Map;

public final class Json {

  private Json() {}

  public static String write(Object value) {
    StringBuilder out = new StringBuilder();
    write(value, out, 0);
    return out.toString();
  }

  private static void write(Object value, StringBuilder out, int depth) {
    if (value == null) {
      out.append("null");
    } else if (value instanceof Map<?, ?> map) {
      writeMap(map, out, depth);
    } else if (value instanceof Collection<?> collection) {
      writeCollection(collection, out, depth);
    } else if (value instanceof Number || value instanceof Boolean) {
      out.append(value);
    } else {
      writeString(value.toString(), out);
    }
  }

  private static void writeMap(Map<?, ?> map, StringBuilder out, int depth) {
    if (map.isEmpty()) {
      out.append("{}");
      return;
    }
    out.append("{\n");
    int index = 0;
    for (Map.Entry<?, ?> entry : map.entrySet()) {
      indent(out, depth + 1);
      writeString(String.valueOf(entry.getKey()), out);
      out.append(": ");
      write(entry.getValue(), out, depth + 1);
      if (++index < map.size()) {
        out.append(',');
      }
      out.append('\n');
    }
    indent(out, depth);
    out.append('}');
  }

  private static void writeCollection(Collection<?> collection, StringBuilder out, int depth) {
    if (collection.isEmpty()) {
      out.append("[]");
      return;
    }
    out.append("[\n");
    int index = 0;
    for (Object element : collection) {
      indent(out, depth + 1);
      write(element, out, depth + 1);
      if (++index < collection.size()) {
        out.append(',');
      }
      out.append('\n');
    }
    indent(out, depth);
    out.append(']');
  }

  private static void indent(StringBuilder out, int depth) {
    out.append("  ".repeat(depth));
  }

  private static void writeString(String text, StringBuilder out) {
    out.append('"');
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      switch (c) {
        case '"' -> out.append("\\\"");
        case '\\' -> out.append("\\\\");
        case '\n' -> out.append("\\n");
        case '\r' -> out.append("\\r");
        case '\t' -> out.append("\\t");
        default -> {
          if (c < 0x20) {
            out.append(String.format("\\u%04x", (int) c));
          } else {
            out.append(c);
          }
        }
      }
    }
    out.append('"');
  }
}
