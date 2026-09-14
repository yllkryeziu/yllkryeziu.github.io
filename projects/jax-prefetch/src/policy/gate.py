from dataclasses import dataclass

import numpy as np

from src.data.prepare import FIRST_PATH_ID
from src.sim.service import ServiceModel


@dataclass(frozen=True)
class GateConfig:
    alpha: float = 1.0
    probability_floor: float = 0.05
    session_budget: int = 8
    waste_penalty_milliseconds: float = 25.0
    cache_pressure_milliseconds: float = 5.0
    max_candidates_per_decision: int = 2


@dataclass
class DecisionState:
    queue_length: int
    concurrency: int
    cache_occupancy: float
    budget_remaining: int


@dataclass
class PolicyCounters:
    decisions: int = 0
    fired: int = 0
    rejected_special_token: int = 0
    rejected_not_cacheable: int = 0
    rejected_probability_floor: int = 0
    rejected_expected_value: int = 0
    rejected_budget: int = 0

    def as_dict(self) -> dict:
        return {key: getattr(self, key) for key in self.__dataclass_fields__}


class NoPrefetchPolicy:
    name = "none"
    session_budget = 0

    def __init__(self) -> None:
        self.counters = PolicyCounters()

    def decide(self, decision_index: int, state: DecisionState) -> list[int]:
        self.counters.decisions += 1
        return []

    def describe(self) -> dict:
        return {"name": self.name}


class TopKPolicy:
    def __init__(
        self,
        name: str,
        k: int,
        top_ids: np.ndarray,
        top_probabilities: np.ndarray,
        vocab_to_path: np.ndarray,
        cacheable: np.ndarray,
        session_budget: int,
    ) -> None:
        self.name = name
        self.k = k
        self.top_ids = top_ids
        self.top_probabilities = top_probabilities
        self.vocab_to_path = vocab_to_path
        self.cacheable = cacheable
        self.session_budget = session_budget
        self.counters = PolicyCounters()

    def decide(self, decision_index: int, state: DecisionState) -> list[int]:
        self.counters.decisions += 1
        chosen: list[int] = []
        for rank in range(self.top_ids.shape[1]):
            if len(chosen) >= self.k:
                break
            if state.budget_remaining - len(chosen) <= 0:
                self.counters.rejected_budget += 1
                break
            vocab_id = int(self.top_ids[decision_index, rank])
            if vocab_id < FIRST_PATH_ID:
                self.counters.rejected_special_token += 1
                continue
            path_index = int(self.vocab_to_path[vocab_id])
            if path_index < 0:
                self.counters.rejected_special_token += 1
                continue
            if not self.cacheable[path_index]:
                self.counters.rejected_not_cacheable += 1
                continue
            chosen.append(path_index)
        self.counters.fired += len(chosen)
        return chosen

    def describe(self) -> dict:
        return {"name": self.name, "k": self.k, "session_budget": self.session_budget}


class StaticRulePolicy:
    name = "static_rule"

    def __init__(
        self,
        current_vocab: np.ndarray,
        markov_table: np.ndarray,
        vocab_to_path: np.ndarray,
        cacheable: np.ndarray,
        threshold: float,
        session_budget: int,
    ) -> None:
        candidates = markov_table[:, FIRST_PATH_ID:]
        self.successor = (np.argmax(candidates, axis=1) + FIRST_PATH_ID).astype(np.int64)
        self.confidence = candidates.max(axis=1).astype(np.float64)
        self.current_vocab = current_vocab
        self.vocab_to_path = vocab_to_path
        self.cacheable = cacheable
        self.threshold = threshold
        self.session_budget = session_budget
        self.counters = PolicyCounters()

    def decide(self, decision_index: int, state: DecisionState) -> list[int]:
        self.counters.decisions += 1
        if state.budget_remaining <= 0:
            self.counters.rejected_budget += 1
            return []
        vocab_id = int(self.current_vocab[decision_index])
        successor = int(self.successor[vocab_id])
        if self.confidence[vocab_id] < self.threshold:
            self.counters.rejected_probability_floor += 1
            return []
        path_index = int(self.vocab_to_path[successor])
        if path_index < 0:
            self.counters.rejected_special_token += 1
            return []
        if not self.cacheable[path_index]:
            self.counters.rejected_not_cacheable += 1
            return []
        self.counters.fired += 1
        return [path_index]

    def describe(self) -> dict:
        return {
            "name": self.name,
            "confidence_threshold": self.threshold,
            "session_budget": self.session_budget,
            "successor_table_source": "july_first_order_markov_argmax_over_real_paths",
        }


class CostAwarePolicy:
    name = "cost_aware_mlp"

    def __init__(
        self,
        top_ids: np.ndarray,
        top_probabilities: np.ndarray,
        vocab_to_path: np.ndarray,
        cacheable: np.ndarray,
        predicted_bytes: np.ndarray,
        service_model: ServiceModel,
        config: GateConfig,
    ) -> None:
        self.top_ids = top_ids
        self.top_probabilities = top_probabilities
        self.vocab_to_path = vocab_to_path
        self.cacheable = cacheable
        self.predicted_bytes = predicted_bytes
        self.service_model = service_model
        self.config = config
        self.session_budget = config.session_budget
        self.counters = PolicyCounters()
        self.expected_value_margins: list[float] = []

    def decide(self, decision_index: int, state: DecisionState) -> list[int]:
        self.counters.decisions += 1
        chosen: list[int] = []
        for rank in range(self.top_ids.shape[1]):
            if len(chosen) >= self.config.max_candidates_per_decision:
                break
            if state.budget_remaining - len(chosen) <= 0:
                self.counters.rejected_budget += 1
                break
            vocab_id = int(self.top_ids[decision_index, rank])
            probability = float(self.top_probabilities[decision_index, rank])
            if vocab_id < FIRST_PATH_ID:
                self.counters.rejected_special_token += 1
                continue
            path_index = int(self.vocab_to_path[vocab_id])
            if path_index < 0:
                self.counters.rejected_special_token += 1
                continue
            if not self.cacheable[path_index]:
                self.counters.rejected_not_cacheable += 1
                continue
            if probability < self.config.probability_floor:
                self.counters.rejected_probability_floor += 1
                continue
            service_milliseconds = self.service_model.expected_milliseconds(
                self.predicted_bytes[path_index]
            )
            latency_saved = service_milliseconds - self.service_model.cache_hit_milliseconds
            expected_gain = probability * latency_saved
            congestion = 1.0 + state.queue_length / max(1, state.concurrency)
            backend_cost = service_milliseconds * congestion
            cache_cost = self.config.cache_pressure_milliseconds * state.cache_occupancy
            waste_cost = self.config.waste_penalty_milliseconds * (1.0 - probability)
            expected_cost = backend_cost + cache_cost + waste_cost
            if expected_gain <= self.config.alpha * expected_cost:
                self.counters.rejected_expected_value += 1
                continue
            chosen.append(path_index)
        self.counters.fired += len(chosen)
        return chosen

    def describe(self) -> dict:
        return {"name": self.name, **vars(self.config)}
