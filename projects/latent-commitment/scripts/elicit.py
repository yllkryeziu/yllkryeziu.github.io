import argparse
import json
import os

import numpy as np

from src.game.phrasing import statement_for
from src.game.world import load_reference_world, agreement, World
from src.model import runner as rn
from src.model.prompts import fact_messages

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3.5-9B")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--out", default=os.path.join(RESULTS, "model_matrix.npy"))
    parser.add_argument("--report", default=os.path.join(RESULTS, "elicitation.json"))
    args = parser.parse_args()

    reference = load_reference_world()
    model = rn.load(args.model, device=args.device)

    prompts = []
    index = []
    for object_index in range(reference.object_count):
        name = reference.display(object_index)
        for attribute_index, attribute in enumerate(reference.attributes):
            statement = statement_for(attribute, name)
            prompts.append(model.chat_prefix(fact_messages(statement)))
            index.append((object_index, attribute_index))

    probabilities = rn.yes_probability(model, prompts, batch_size=args.batch_size)

    probability_matrix = np.zeros(reference.matrix.shape, dtype=np.float32)
    for (object_index, attribute_index), value in zip(index, probabilities):
        probability_matrix[object_index, attribute_index] = value

    binary = (probability_matrix >= 0.5).astype(np.int8)

    os.makedirs(RESULTS, exist_ok=True)
    np.save(args.out, binary)
    np.save(args.out.replace(".npy", "_probabilities.npy"), probability_matrix)

    model_world = World(reference.objects, reference.attributes, binary, args.model)
    unique = model_world.rows_are_unique()
    confident = float(((probability_matrix < 0.1) | (probability_matrix > 0.9)).mean())

    duplicates = {}
    seen = {}
    for i, row in enumerate(binary):
        key = tuple(int(v) for v in row)
        if key in seen:
            duplicates.setdefault(reference.display(seen[key]), []).append(reference.display(i))
        else:
            seen[key] = i

    report = {
        "model": args.model,
        "objects": reference.object_count,
        "attributes": reference.attribute_count,
        "agreement_with_human_annotation": agreement(reference, model_world),
        "rows_unique_under_model_beliefs": unique,
        "duplicate_rows": duplicates,
        "fraction_confident": confident,
        "mean_yes_probability": float(probability_matrix.mean()),
        "per_attribute_agreement": {
            reference.attributes[i]: float((reference.matrix[:, i] == binary[:, i]).mean())
            for i in range(reference.attribute_count)
        },
    }
    with open(args.report, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(f"agreement with human annotation: {report['agreement_with_human_annotation']:.3f}")
    print(f"rows unique under model beliefs: {unique}")
    print(f"confident answers (p<0.1 or p>0.9): {confident:.3f}")
    if duplicates:
        print("collisions:", duplicates)


if __name__ == "__main__":
    main()
