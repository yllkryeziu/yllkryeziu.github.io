import argparse
import csv
import hashlib
import json
import re
import sys
from typing import Any, Dict, List, Optional

NULL = 0
BOOL = 1
INT = 2
FLOAT = 3
STRING = 4

INT_PATTERN = re.compile(r"^-?\d+$")
FLOAT_PATTERN = re.compile(r"^-?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$")
BOOL_VALUES = {"true": True, "false": False}

INT64_MIN = -(2 ** 63)
INT64_MAX = 2 ** 63 - 1


def classify(raw: str) -> int:
    if raw == "":
        return NULL
    if raw in BOOL_VALUES:
        return BOOL
    if INT_PATTERN.match(raw):
        value = int(raw)
        if INT64_MIN <= value <= INT64_MAX:
            return INT
        return STRING
    if FLOAT_PATTERN.match(raw):
        return FLOAT
    return STRING


def infer_column_types(csv_path: str, header: List[str]) -> List[int]:
    types = [NULL] * len(header)
    with open(csv_path, newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        next(reader)
        for row in reader:
            for index, raw in enumerate(row):
                observed = classify(raw)
                if observed > types[index]:
                    types[index] = observed
    return types


def convert(raw: str, column_type: int) -> Any:
    if raw == "":
        return None
    if column_type == BOOL:
        return BOOL_VALUES[raw]
    if column_type == INT:
        return int(raw)
    if column_type == FLOAT:
        if INT_PATTERN.match(raw):
            return float(int(raw))
        return float(raw)
    return raw


def write_feed(csv_path: str, ndjson_path: str) -> Dict[str, Any]:
    with open(csv_path, newline="", encoding="utf-8") as handle:
        header = next(csv.reader(handle))

    types = infer_column_types(csv_path, header)

    digest = hashlib.sha256()
    records = 0
    line_lengths: List[int] = []

    with open(csv_path, newline="", encoding="utf-8") as source, \
            open(ndjson_path, "w", encoding="utf-8", newline="\n") as sink:
        reader = csv.reader(source)
        next(reader)
        for row in reader:
            record = {
                header[index]: convert(row[index], types[index])
                for index in range(len(header))
            }
            line = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
            encoded = line.encode("utf-8")
            sink.write(line)
            digest.update(encoded)
            line_lengths.append(len(encoded))
            records += 1

    type_names = {NULL: "null", BOOL: "boolean", INT: "integer", FLOAT: "number", STRING: "string"}
    return {
        "csv_path": csv_path,
        "ndjson_path": ndjson_path,
        "records": records,
        "columns": len(header),
        "bytes": sum(line_lengths),
        "sha256": digest.hexdigest(),
        "min_line_bytes": min(line_lengths),
        "max_line_bytes": max(line_lengths),
        "mean_line_bytes": round(sum(line_lengths) / records, 3),
        "column_types": {header[i]: type_names[types[i]] for i in range(len(header))},
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()

    summary = write_feed(args.csv, args.out)
    with open(args.manifest, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2, sort_keys=True)
        handle.write("\n")

    print(f"records={summary['records']} bytes={summary['bytes']} sha256={summary['sha256']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
