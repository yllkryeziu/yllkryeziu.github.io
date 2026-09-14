import os
from dataclasses import dataclass

import numpy as np

from src.game.phrasing import question_for

DATA_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "Animals_with_Attributes2",
)


@dataclass(frozen=True)
class World:
    objects: tuple[str, ...]
    attributes: tuple[str, ...]
    matrix: np.ndarray
    source: str

    @property
    def object_count(self) -> int:
        return len(self.objects)

    @property
    def attribute_count(self) -> int:
        return len(self.attributes)

    def display(self, index: int) -> str:
        return self.objects[index].replace("+", " ")

    def question(self, attribute_index: int) -> str:
        return question_for(self.attributes[attribute_index])

    def rows_are_unique(self) -> bool:
        return len({tuple(row) for row in self.matrix}) == self.object_count


def _read_names(path: str) -> tuple[str, ...]:
    with open(path, encoding="utf-8") as handle:
        return tuple(line.split()[1] for line in handle if line.strip())


def load_reference_world(root: str = DATA_ROOT) -> World:
    objects = _read_names(os.path.join(root, "classes.txt"))
    attributes = _read_names(os.path.join(root, "predicates.txt"))
    matrix = np.loadtxt(os.path.join(root, "predicate-matrix-binary.txt"), dtype=np.int8)
    return World(objects, attributes, matrix, "awa2_human_annotation")


def load_model_world(path: str, reference: World) -> World:
    matrix = np.load(path)
    if matrix.shape != reference.matrix.shape:
        raise ValueError(f"expected {reference.matrix.shape}, got {matrix.shape}")
    return World(reference.objects, reference.attributes, matrix.astype(np.int8), path)


def restrict(world: World, attribute_indices: list[int]) -> World:
    return World(
        world.objects,
        tuple(world.attributes[i] for i in attribute_indices),
        world.matrix[:, attribute_indices],
        world.source,
    )


def balanced_attributes(world: World, low: float = 0.2, high: float = 0.8) -> list[int]:
    fraction = world.matrix.mean(axis=0)
    return [i for i, value in enumerate(fraction) if low <= value <= high]


def agreement(left: World, right: World) -> float:
    return float((left.matrix == right.matrix).mean())
