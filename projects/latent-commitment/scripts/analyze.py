import argparse
import glob
import json
import os

import numpy as np

from src.game.phrasing import question_for
from src.game.world import load_model_world, load_reference_world

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")


def agreement_tables(world, matrix, transcripts, question_index):
    by_turn = {}
    by_attribute = {}
    per_game = []
    for record in transcripts:
        revealed = record["revealed_index"]
        if revealed is None:
            continue
        hits = []
        for turn, (question, answer) in enumerate(
                zip(record["questions"], record["answers"]), 1):
            attribute = question_index.get(question)
            if attribute is None:
                continue
            agrees = (answer == "Yes") == bool(matrix[revealed, attribute])
            by_turn.setdefault(turn, []).append(agrees)
            by_attribute.setdefault(world.attributes[attribute], []).append(agrees)
            hits.append(agrees)
        if hits:
            per_game.append(float(np.mean(hits)))
    return by_turn, by_attribute, per_game


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--world", default=os.path.join(RESULTS, "model_matrix.npy"))
    parser.add_argument("--out", default=os.path.join(RESULTS, "analysis.json"))
    parser.add_argument("--min-attribute-count", type=int, default=25)
    args = parser.parse_args()

    reference = load_reference_world()
    world = load_model_world(args.world, reference)
    matrix = world.matrix
    question_index = {question_for(a): i for i, a in enumerate(world.attributes)}

    report = {"arms": {}}
    for path in sorted(glob.glob(os.path.join(RESULTS, "transcripts_*.json"))):
        tag = os.path.basename(path)[len("transcripts_"):-len(".json")]
        with open(path, encoding="utf-8") as handle:
            transcripts = json.load(handle)
        by_turn, by_attribute, per_game = agreement_tables(
            world, matrix, transcripts, question_index)
        if not by_turn:
            continue

        turns = sorted(by_turn)[:12]
        values = [float(np.mean(by_turn[t])) for t in turns]
        slope = float(np.polyfit(turns, values, 1)[0]) if len(turns) > 1 else None

        attributes = [
            {
                "attribute": name,
                "agreement": float(np.mean(v)),
                "count": len(v),
            }
            for name, v in by_attribute.items()
            if len(v) >= args.min_attribute_count
        ]
        attributes.sort(key=lambda row: row["agreement"])

        base_rate = matrix.mean(axis=0)
        skew_rows = []
        for name, values in by_attribute.items():
            if len(values) < args.min_attribute_count:
                continue
            index = world.attributes.index(name)
            skew_rows.append({
                "attribute": name,
                "base_rate": float(base_rate[index]),
                "skew": float(abs(base_rate[index] - 0.5)),
                "agreement": float(np.mean(values)),
                "count": len(values),
            })
        correlation = None
        balanced_mean = None
        skewed_mean = None
        if len(skew_rows) > 2:
            skews = np.array([r["skew"] for r in skew_rows])
            accs = np.array([r["agreement"] for r in skew_rows])
            correlation = float(np.corrcoef(skews, accs)[0, 1])
            balanced = [r["agreement"] for r in skew_rows if r["skew"] < 0.15]
            skewed = [r["agreement"] for r in skew_rows if r["skew"] > 0.35]
            balanced_mean = float(np.mean(balanced)) if balanced else None
            skewed_mean = float(np.mean(skewed)) if skewed else None

        report["arms"][tag] = {
            "skew_correlation": correlation,
            "balanced_attribute_agreement": balanced_mean,
            "skewed_attribute_agreement": skewed_mean,
            "balanced_attribute_count": sum(1 for r in skew_rows if r["skew"] < 0.15),
            "skewed_attribute_count": sum(1 for r in skew_rows if r["skew"] > 0.35),
            "attribute_skew": sorted(skew_rows, key=lambda r: r["skew"]),
            "games_with_reveal": len(per_game),
            "overall_agreement": float(np.mean(per_game)),
            "agreement_by_turn": [
                {"turn": t, "agreement": float(np.mean(by_turn[t])), "n": len(by_turn[t])}
                for t in sorted(by_turn)
            ],
            "turn_trend_per_turn": slope,
            "least_reliable_attributes": attributes[:8],
            "most_reliable_attributes": attributes[-5:][::-1],
        }

    report["note"] = (
        "The optimal questioner asks the same question at turn 1 in every game, so turn index and "
        "attribute are confounded in that arm. The random arm decorrelates them and is the one to "
        "read for any claim about drift over turns. skew is |base_rate - 0.5| over the 50 animals: "
        "an attribute with skew near 0.5 has the same answer for almost every animal and can "
        "therefore be answered without knowing which animal was chosen."
    )

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    for tag, arm in report["arms"].items():
        trend = arm["turn_trend_per_turn"]
        print(f"{tag:10s} overall {arm['overall_agreement']:.3f}  "
              f"turn trend {trend:+.4f}/turn  games {arm['games_with_reveal']}")


if __name__ == "__main__":
    main()
