import time
from dataclasses import dataclass

import jax
import jax.numpy as jnp
import numpy as np
import optax

from src.data.features import Features
from src.model.mlp import Batch, Params, batch_logits, cross_entropy_loss, init_params, parameter_count


@dataclass(frozen=True)
class TrainingConfig:
    seed: int = 0
    epochs: int = 8
    batch_size: int = 1024
    learning_rate: float = 3e-3
    weight_decay: float = 1e-6
    gradient_clip: float = 1.0
    evaluation_chunk: int = 32768


def to_batch(features: Features, indices: np.ndarray) -> Batch:
    return Batch(
        current=jnp.asarray(features.current[indices]),
        previous=jnp.asarray(features.previous[indices]),
        previous_two=jnp.asarray(features.previous_two[indices]),
        position=jnp.asarray(features.position[indices]),
        inter_arrival=jnp.asarray(features.inter_arrival[indices]),
        hour=jnp.asarray(features.hour[indices]),
        size=jnp.asarray(features.size[indices]),
        scalars=jnp.asarray(features.scalars[indices]),
        labels=jnp.asarray(features.labels[indices]),
    )


def make_update(optimizer: optax.GradientTransformation, weight_decay: float):
    @jax.jit
    def update(params: Params, optimizer_state, batch: Batch):
        loss, gradients = jax.value_and_grad(cross_entropy_loss)(params, batch, weight_decay)
        updates, optimizer_state = optimizer.update(gradients, optimizer_state, params)
        params = optax.apply_updates(params, updates)
        return params, optimizer_state, loss

    return update


@jax.jit
def probabilities_batch(params: Params, batch: Batch) -> jnp.ndarray:
    return jax.nn.softmax(batch_logits(params, batch), axis=-1)


def evaluate_cross_entropy(params: Params, features: Features, chunk: int) -> float:
    total = 0.0
    count = len(features)
    for start in range(0, count, chunk):
        end = min(start + chunk, count)
        indices = np.arange(start, end)
        batch = to_batch(features, indices)
        probabilities = np.asarray(probabilities_batch(params, batch))
        picked = probabilities[np.arange(end - start), features.labels[start:end]]
        total += float(np.log(np.maximum(picked, 1e-12)).sum())
    return -total / count


def train_model(
    train: Features,
    validation: Features,
    vocabulary_size: int,
    config: TrainingConfig,
) -> tuple[Params, dict]:
    key = jax.random.PRNGKey(config.seed)
    key, init_key = jax.random.split(key)
    params = init_params(init_key, vocabulary_size)
    steps_per_epoch = max(1, len(train) // config.batch_size)
    schedule = optax.cosine_decay_schedule(config.learning_rate, config.epochs * steps_per_epoch)
    optimizer = optax.chain(
        optax.clip_by_global_norm(config.gradient_clip),
        optax.adam(schedule),
    )
    optimizer_state = optimizer.init(params)
    update = make_update(optimizer, config.weight_decay)

    rng = np.random.default_rng(config.seed)
    history = []
    best_params = params
    best_validation = float("inf")
    start_time = time.perf_counter()
    for epoch in range(config.epochs):
        order = rng.permutation(len(train))
        epoch_loss = 0.0
        for step in range(steps_per_epoch):
            indices = order[step * config.batch_size : (step + 1) * config.batch_size]
            batch = to_batch(train, indices)
            params, optimizer_state, loss = update(params, optimizer_state, batch)
            epoch_loss += float(loss)
        validation_loss = evaluate_cross_entropy(params, validation, config.evaluation_chunk)
        history.append(
            {
                "epoch": epoch,
                "train_loss_nats": epoch_loss / steps_per_epoch,
                "val_cross_entropy_nats": validation_loss,
                "elapsed_seconds": time.perf_counter() - start_time,
            }
        )
        if validation_loss < best_validation:
            best_validation = validation_loss
            best_params = params
    training_seconds = time.perf_counter() - start_time

    info = {
        "config": vars(config),
        "vocabulary_size": vocabulary_size,
        "parameter_count": parameter_count(best_params),
        "steps_per_epoch": steps_per_epoch,
        "training_seconds": training_seconds,
        "best_val_cross_entropy_nats": best_validation,
        "history": history,
    }
    return best_params, info


def measure_inference_latency(params: Params, features: Features, repeats: int = 2000) -> dict:
    single = jax.jit(lambda p, b: jax.nn.softmax(batch_logits(p, b), axis=-1))
    batch = to_batch(features, np.array([0]))
    for _ in range(50):
        single(params, batch).block_until_ready()
    samples = []
    for index in range(repeats):
        one = to_batch(features, np.array([index % len(features)]))
        start = time.perf_counter()
        single(params, one).block_until_ready()
        samples.append((time.perf_counter() - start) * 1e6)
    fixed = []
    for _ in range(repeats):
        start = time.perf_counter()
        single(params, batch).block_until_ready()
        fixed.append((time.perf_counter() - start) * 1e6)
    return {
        "repeats": repeats,
        "with_host_transfer_microseconds_median": float(np.median(samples)),
        "with_host_transfer_microseconds_p95": float(np.percentile(samples, 95)),
        "device_resident_microseconds_median": float(np.median(fixed)),
        "device_resident_microseconds_p95": float(np.percentile(fixed, 95)),
        "device_resident_microseconds_mean": float(np.mean(fixed)),
    }


class MlpPredictor:
    name = "jax_mlp"

    def __init__(self, params: Params) -> None:
        self.params = params

    def predict(self, features: Features, start: int, end: int) -> np.ndarray:
        indices = np.arange(start, end)
        return np.asarray(probabilities_batch(self.params, to_batch(features, indices)), dtype=np.float64)
