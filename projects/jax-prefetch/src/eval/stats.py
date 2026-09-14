import numpy as np
from scipy import stats

CONFIDENCE_LEVEL = 0.95


def mean_with_confidence_interval(values: list[float]) -> dict:
    array = np.asarray([value for value in values if np.isfinite(value)], dtype=np.float64)
    count = int(array.size)
    if count == 0:
        return {"mean": None, "ci_low": None, "ci_high": None, "n": 0, "std": None}
    mean = float(array.mean())
    if count == 1:
        return {"mean": mean, "ci_low": mean, "ci_high": mean, "n": 1, "std": 0.0}
    standard_error = float(array.std(ddof=1) / np.sqrt(count))
    half_width = float(stats.t.ppf(0.5 + CONFIDENCE_LEVEL / 2.0, count - 1) * standard_error)
    return {
        "mean": mean,
        "ci_low": mean - half_width,
        "ci_high": mean + half_width,
        "n": count,
        "std": float(array.std(ddof=1)),
    }


def paired_difference(treatment: list[float], control: list[float]) -> dict:
    differences = [t - c for t, c in zip(treatment, control) if np.isfinite(t) and np.isfinite(c)]
    return mean_with_confidence_interval(differences)
