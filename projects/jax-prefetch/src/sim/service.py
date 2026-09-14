from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class ServiceModel:
    base_milliseconds: float
    bytes_per_millisecond: float
    jitter_sigma: float
    cache_hit_milliseconds: float

    def expected_milliseconds(self, response_bytes: float) -> float:
        return self.base_milliseconds + response_bytes / self.bytes_per_millisecond

    def sample_milliseconds(self, response_bytes: float, generator: np.random.Generator) -> float:
        deterministic = self.expected_milliseconds(response_bytes)
        jitter = float(
            generator.lognormal(mean=-0.5 * self.jitter_sigma**2, sigma=self.jitter_sigma)
        )
        return deterministic * jitter


DEFAULT_SERVICE_MODEL = ServiceModel(
    base_milliseconds=20.0,
    bytes_per_millisecond=1000.0,
    jitter_sigma=0.35,
    cache_hit_milliseconds=1.0,
)
