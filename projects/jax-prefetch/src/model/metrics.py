import numpy as np

from src.data.prepare import END_ID

CALIBRATION_BINS = 15
TOP_K = 5


class PredictionAccumulator:
    def __init__(self, calibration_bins: int = CALIBRATION_BINS) -> None:
        self.calibration_bins = calibration_bins
        self.count = 0
        self.hits = np.zeros(TOP_K, dtype=np.int64)
        self.log_likelihood = 0.0
        self.bin_count = np.zeros(calibration_bins, dtype=np.int64)
        self.bin_confidence = np.zeros(calibration_bins, dtype=np.float64)
        self.bin_correct = np.zeros(calibration_bins, dtype=np.int64)
        self.non_terminal_count = 0
        self.non_terminal_hits = np.zeros(TOP_K, dtype=np.int64)
        self.top_indices: list[np.ndarray] = []
        self.top_probabilities: list[np.ndarray] = []

    def update(self, probabilities: np.ndarray, labels: np.ndarray) -> None:
        batch_size = labels.shape[0]
        order = np.argsort(-probabilities, axis=1, kind="stable")[:, :TOP_K]
        top_probabilities = np.take_along_axis(probabilities, order, axis=1)
        self.top_indices.append(order.astype(np.int32))
        self.top_probabilities.append(top_probabilities.astype(np.float32))

        matches = order == labels[:, None]
        cumulative = np.cumsum(matches, axis=1) > 0
        self.hits += cumulative.sum(axis=0)
        self.count += batch_size

        non_terminal = labels != END_ID
        self.non_terminal_hits += cumulative[non_terminal].sum(axis=0)
        self.non_terminal_count += int(non_terminal.sum())

        label_probabilities = probabilities[np.arange(batch_size), labels]
        self.log_likelihood += float(np.log(np.maximum(label_probabilities, 1e-12)).sum())

        confidence = top_probabilities[:, 0]
        correct = matches[:, 0]
        bins = np.minimum((confidence * self.calibration_bins).astype(np.int64), self.calibration_bins - 1)
        np.add.at(self.bin_count, bins, 1)
        np.add.at(self.bin_confidence, bins, confidence)
        np.add.at(self.bin_correct, bins, correct.astype(np.int64))

    def expected_calibration_error(self) -> float:
        occupied = self.bin_count > 0
        accuracy = np.zeros(self.calibration_bins)
        confidence = np.zeros(self.calibration_bins)
        accuracy[occupied] = self.bin_correct[occupied] / self.bin_count[occupied]
        confidence[occupied] = self.bin_confidence[occupied] / self.bin_count[occupied]
        weights = self.bin_count / max(1, self.count)
        return float(np.sum(weights * np.abs(accuracy - confidence)))

    def reliability_curve(self) -> list[dict]:
        points = []
        for index in range(self.calibration_bins):
            count = int(self.bin_count[index])
            if count == 0:
                continue
            points.append(
                {
                    "bin_lower": index / self.calibration_bins,
                    "bin_upper": (index + 1) / self.calibration_bins,
                    "count": count,
                    "mean_confidence": float(self.bin_confidence[index] / count),
                    "empirical_accuracy": float(self.bin_correct[index] / count),
                }
            )
        return points

    def summary(self) -> dict:
        return {
            "examples": self.count,
            "top1_accuracy": float(self.hits[0] / self.count),
            "top3_accuracy": float(self.hits[2] / self.count),
            "top5_accuracy": float(self.hits[4] / self.count),
            "cross_entropy_nats": float(-self.log_likelihood / self.count),
            "perplexity": float(np.exp(-self.log_likelihood / self.count)),
            "expected_calibration_error": self.expected_calibration_error(),
            "calibration_bins": self.calibration_bins,
            "reliability_curve": self.reliability_curve(),
            "non_terminal_examples": self.non_terminal_count,
            "non_terminal_top1_accuracy": float(self.non_terminal_hits[0] / max(1, self.non_terminal_count)),
            "non_terminal_top3_accuracy": float(self.non_terminal_hits[2] / max(1, self.non_terminal_count)),
            "non_terminal_top5_accuracy": float(self.non_terminal_hits[4] / max(1, self.non_terminal_count)),
        }

    def predictions(self) -> tuple[np.ndarray, np.ndarray]:
        return np.concatenate(self.top_indices), np.concatenate(self.top_probabilities)
