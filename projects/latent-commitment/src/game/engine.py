from dataclasses import dataclass, field

import numpy as np

from src.game.world import World


@dataclass
class GameState:
    world: World
    consistent: np.ndarray
    asked: list[int] = field(default_factory=list)
    answers: list[bool] = field(default_factory=list)

    @property
    def candidate_count(self) -> int:
        return int(self.consistent.sum())

    @property
    def alive(self) -> bool:
        return self.candidate_count > 0

    @property
    def solved(self) -> bool:
        return self.candidate_count == 1

    def candidates(self) -> list[int]:
        return [int(i) for i in np.flatnonzero(self.consistent)]


def new_game(world: World) -> GameState:
    return GameState(world=world, consistent=np.ones(world.object_count, dtype=bool))


def apply_answer(state: GameState, attribute_index: int, answer: bool) -> GameState:
    column = state.world.matrix[:, attribute_index].astype(bool)
    match = column if answer else ~column
    return GameState(
        world=state.world,
        consistent=state.consistent & match,
        asked=state.asked + [attribute_index],
        answers=state.answers + [answer],
    )


def _entropy(counts: np.ndarray) -> float:
    total = counts.sum()
    if total == 0:
        return 0.0
    probabilities = counts[counts > 0] / total
    return float(-(probabilities * np.log2(probabilities)).sum())


def information_gain(state: GameState, attribute_index: int) -> float:
    if not state.alive:
        return 0.0
    column = state.world.matrix[:, attribute_index].astype(bool)
    alive = state.consistent
    yes = int((alive & column).sum())
    no = int((alive & ~column).sum())
    total = yes + no
    if total == 0 or yes == 0 or no == 0:
        return 0.0
    before = np.log2(total)
    after = (yes / total) * np.log2(yes) + (no / total) * np.log2(no)
    return float(before - after)


def best_question(state: GameState) -> int | None:
    remaining = [i for i in range(state.world.attribute_count) if i not in set(state.asked)]
    if not remaining:
        return None
    gains = [(information_gain(state, i), -i) for i in remaining]
    best_gain, negative_index = max(gains)
    if best_gain <= 0.0:
        return None
    return -negative_index


def random_question(state: GameState, generator: np.random.Generator) -> int | None:
    remaining = [i for i in range(state.world.attribute_count) if i not in set(state.asked)]
    if not remaining:
        return None
    return int(generator.choice(remaining))


def posterior(state: GameState) -> np.ndarray:
    if not state.alive:
        return np.zeros(state.world.object_count)
    return state.consistent / state.consistent.sum()


def truthful_answer(world: World, object_index: int, attribute_index: int) -> bool:
    return bool(world.matrix[object_index, attribute_index])


def optimal_game_length(world: World) -> float:
    return float(np.log2(world.object_count))
