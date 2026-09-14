from typing import NamedTuple

import jax
import jax.numpy as jnp

from src.data.features import (
    HOUR_BUCKETS,
    INTER_ARRIVAL_BUCKETS,
    POSITION_BUCKETS,
    SIZE_BUCKETS,
)

PATH_EMBEDDING_DIM = 48
CONTEXT_EMBEDDING_DIM = 8
HIDDEN_UNITS = 256
SCALAR_FEATURES = 3


class Batch(NamedTuple):
    current: jnp.ndarray
    previous: jnp.ndarray
    previous_two: jnp.ndarray
    position: jnp.ndarray
    inter_arrival: jnp.ndarray
    hour: jnp.ndarray
    size: jnp.ndarray
    scalars: jnp.ndarray
    labels: jnp.ndarray


class Params(NamedTuple):
    path_embedding: jnp.ndarray
    position_embedding: jnp.ndarray
    inter_arrival_embedding: jnp.ndarray
    hour_embedding: jnp.ndarray
    size_embedding: jnp.ndarray
    hidden_weights: jnp.ndarray
    hidden_bias: jnp.ndarray
    output_weights: jnp.ndarray
    output_bias: jnp.ndarray


def input_dimension() -> int:
    return 3 * PATH_EMBEDDING_DIM + 4 * CONTEXT_EMBEDDING_DIM + SCALAR_FEATURES


def init_params(key: jax.Array, vocabulary_size: int) -> Params:
    keys = jax.random.split(key, 9)
    embedding_scale = 0.05
    fan_in = input_dimension()
    return Params(
        path_embedding=jax.random.normal(keys[0], (vocabulary_size, PATH_EMBEDDING_DIM)) * embedding_scale,
        position_embedding=jax.random.normal(keys[1], (POSITION_BUCKETS, CONTEXT_EMBEDDING_DIM)) * embedding_scale,
        inter_arrival_embedding=jax.random.normal(keys[2], (INTER_ARRIVAL_BUCKETS, CONTEXT_EMBEDDING_DIM)) * embedding_scale,
        hour_embedding=jax.random.normal(keys[3], (HOUR_BUCKETS, CONTEXT_EMBEDDING_DIM)) * embedding_scale,
        size_embedding=jax.random.normal(keys[4], (SIZE_BUCKETS, CONTEXT_EMBEDDING_DIM)) * embedding_scale,
        hidden_weights=jax.random.normal(keys[5], (fan_in, HIDDEN_UNITS)) * jnp.sqrt(2.0 / fan_in),
        hidden_bias=jnp.zeros((HIDDEN_UNITS,)),
        output_weights=jax.random.normal(keys[6], (HIDDEN_UNITS, vocabulary_size)) * jnp.sqrt(1.0 / HIDDEN_UNITS),
        output_bias=jnp.zeros((vocabulary_size,)),
    )


def forward_single(
    params: Params,
    current: jnp.ndarray,
    previous: jnp.ndarray,
    previous_two: jnp.ndarray,
    position: jnp.ndarray,
    inter_arrival: jnp.ndarray,
    hour: jnp.ndarray,
    size: jnp.ndarray,
    scalars: jnp.ndarray,
) -> jnp.ndarray:
    features = jnp.concatenate(
        [
            params.path_embedding[current],
            params.path_embedding[previous],
            params.path_embedding[previous_two],
            params.position_embedding[position],
            params.inter_arrival_embedding[inter_arrival],
            params.hour_embedding[hour],
            params.size_embedding[size],
            scalars,
        ]
    )
    hidden = jnp.tanh(features @ params.hidden_weights + params.hidden_bias)
    return hidden @ params.output_weights + params.output_bias


forward_batch = jax.vmap(forward_single, in_axes=(None, 0, 0, 0, 0, 0, 0, 0, 0))


def batch_logits(params: Params, batch: Batch) -> jnp.ndarray:
    return forward_batch(
        params,
        batch.current,
        batch.previous,
        batch.previous_two,
        batch.position,
        batch.inter_arrival,
        batch.hour,
        batch.size,
        batch.scalars,
    )


def cross_entropy_loss(params: Params, batch: Batch, weight_decay: float) -> jnp.ndarray:
    logits = batch_logits(params, batch)
    log_probabilities = jax.nn.log_softmax(logits, axis=-1)
    picked = jnp.take_along_axis(log_probabilities, batch.labels[:, None], axis=-1)[:, 0]
    penalty = weight_decay * (
        jnp.sum(params.hidden_weights ** 2) + jnp.sum(params.output_weights ** 2)
    )
    return -jnp.mean(picked) + penalty


def parameter_count(params: Params) -> int:
    return int(sum(int(leaf.size) for leaf in jax.tree.leaves(params)))
