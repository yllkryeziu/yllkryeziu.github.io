import heapq
from dataclasses import dataclass

import numpy as np

from src.policy.gate import DecisionState
from src.sim.cache import LruTtlCache
from src.sim.origin import Origin, OriginJob
from src.sim.service import ServiceModel
from src.sim.workload import ReplayWindow, Workload

EVENT_SESSION_START = 0
EVENT_REQUEST = 1
EVENT_ORIGIN_DONE = 2
EVENT_COMPLETE = 3


@dataclass(frozen=True)
class GatewayConfig:
    origin_concurrency: int
    cache_capacity_entries: int
    cache_ttl_seconds: float
    time_scale: float


class Gateway:
    def __init__(
        self,
        workload: Workload,
        window: ReplayWindow,
        policy,
        service_model: ServiceModel,
        config: GatewayConfig,
        seed: int,
    ) -> None:
        self.workload = workload
        self.window = window
        self.policy = policy
        self.service_model = service_model
        self.config = config
        self.generator = np.random.default_rng(seed)
        self.cache = LruTtlCache(config.cache_capacity_entries, config.cache_ttl_seconds)
        self.origin = Origin(config.origin_concurrency)
        self.events: list[tuple[float, int, int, tuple]] = []
        self.sequence = 0
        self.pending: dict[int, list[tuple[int, int, float]]] = {}
        self.in_flight_is_prefetch: dict[int, bool] = {}
        self.budget = np.full(len(window.session_starts), policy.session_budget, dtype=np.int64)
        self.latencies: list[float] = []
        self.cache_hits = 0
        self.origin_misses = 0
        self.inflight_attach = 0
        self.prefetch_issued = 0
        self.prefetch_used_inflight = 0
        self.prefetch_skipped_cached = 0
        self.prefetch_skipped_inflight = 0
        self.queue_length_samples: list[int] = []

    def push(self, time_seconds: float, kind: int, payload: tuple) -> None:
        self.sequence += 1
        heapq.heappush(self.events, (time_seconds, self.sequence, kind, payload))

    def start_job(self, job: OriginJob, now: float) -> None:
        duration = self.service_model.sample_milliseconds(job.response_bytes, self.generator) / 1000.0
        self.push(now + duration, EVENT_ORIGIN_DONE, (job,))

    def submit(self, job: OriginJob, now: float) -> None:
        started = self.origin.submit(job)
        if started is not None:
            self.start_job(started, now)

    def run(self) -> dict:
        for session_index, start in enumerate(self.window.session_starts):
            self.push(float(start), EVENT_SESSION_START, (session_index,))
        while self.events:
            time_seconds, _, kind, payload = heapq.heappop(self.events)
            if kind == EVENT_SESSION_START:
                self.push(time_seconds, EVENT_REQUEST, (payload[0], 0, time_seconds))
            elif kind == EVENT_REQUEST:
                self.handle_request(time_seconds, *payload)
            elif kind == EVENT_COMPLETE:
                self.complete_request(time_seconds, *payload)
            else:
                self.handle_origin_done(time_seconds, payload[0])
        self.cache.drain()
        return self.summary()

    def flat_index(self, session_index: int, step: int) -> int:
        return int(self.window.offsets[session_index]) + step

    def handle_request(self, now: float, session_index: int, step: int, arrival: float) -> None:
        flat = self.flat_index(session_index, step)
        key = int(self.window.path_indices[flat])
        entry = self.cache.lookup(key, now)
        if entry is not None:
            self.cache_hits += 1
            finish = now + self.service_model.cache_hit_milliseconds / 1000.0
            self.push(finish, EVENT_COMPLETE, (session_index, step, arrival))
            return
        if key in self.in_flight_is_prefetch:
            self.inflight_attach += 1
            self.pending.setdefault(key, []).append((session_index, step, arrival))
            return
        self.origin_misses += 1
        self.in_flight_is_prefetch[key] = False
        self.pending.setdefault(key, []).append((session_index, step, arrival))
        self.queue_length_samples.append(self.origin.queue_length())
        self.submit(
            OriginJob(
                key=key,
                is_prefetch=False,
                enqueued_at=now,
                response_bytes=float(self.window.response_bytes[flat]),
                decision_index=flat,
            ),
            now,
        )

    def handle_origin_done(self, now: float, job: OriginJob) -> None:
        self.in_flight_is_prefetch.pop(job.key, None)
        cacheable = bool(self.workload.cacheable[job.key])
        waiters = self.pending.pop(job.key, [])
        if cacheable:
            self.cache.insert(job.key, now, prefetched=job.is_prefetch)
            if job.is_prefetch and waiters:
                entry = self.cache.entries[job.key]
                entry.used_by_real_request = True
                self.cache.prefetched_used += 1
                self.prefetch_used_inflight += 1
        for session_index, step, arrival in waiters:
            self.push(now, EVENT_COMPLETE, (session_index, step, arrival))
        released = self.origin.release(now)
        if released is not None:
            self.start_job(released, now)

    def complete_request(self, now: float, session_index: int, step: int, arrival: float) -> None:
        self.latencies.append((now - arrival) * 1000.0)
        flat = self.flat_index(session_index, step)
        state = DecisionState(
            queue_length=self.origin.queue_length(),
            concurrency=self.config.origin_concurrency,
            cache_occupancy=self.cache.occupancy_fraction(),
            budget_remaining=int(self.budget[session_index]),
        )
        candidates = self.policy.decide(int(self.window.decision_indices[flat]), state)
        for path_index in candidates:
            if self.budget[session_index] <= 0:
                break
            if self.cache.contains_fresh(path_index, now):
                self.prefetch_skipped_cached += 1
                continue
            if path_index in self.in_flight_is_prefetch:
                self.prefetch_skipped_inflight += 1
                continue
            self.budget[session_index] -= 1
            self.prefetch_issued += 1
            self.in_flight_is_prefetch[path_index] = True
            self.queue_length_samples.append(self.origin.queue_length())
            self.submit(
                OriginJob(
                    key=path_index,
                    is_prefetch=True,
                    enqueued_at=now,
                    response_bytes=float(self.workload.predicted_bytes[path_index]),
                    decision_index=flat,
                ),
                now,
            )
        session_end = int(self.window.offsets[session_index + 1])
        if flat + 1 < session_end:
            think = float(self.window.think_times[flat])
            self.push(now + think, EVENT_REQUEST, (session_index, step + 1, now + think))

    def summary(self) -> dict:
        latencies = np.asarray(self.latencies)
        served = int(latencies.size)
        issued = self.cache.prefetched_inserted
        used = self.cache.prefetched_used
        span = (self.window.real_end_epoch - self.window.real_start_epoch) / self.config.time_scale
        return {
            "requests_served": served,
            "sessions": int(len(self.window.session_starts)),
            "latency_ms_mean": float(latencies.mean()) if served else float("nan"),
            "latency_ms_p50": float(np.percentile(latencies, 50)) if served else float("nan"),
            "latency_ms_p95": float(np.percentile(latencies, 95)) if served else float("nan"),
            "latency_ms_p99": float(np.percentile(latencies, 99)) if served else float("nan"),
            "origin_requests_total": self.origin.jobs_started,
            "origin_requests_real": self.origin.jobs_real,
            "origin_requests_prefetch": self.origin.jobs_prefetch,
            "cache_hit_rate": self.cache_hits / max(1, served),
            "inflight_attach_rate": self.inflight_attach / max(1, served),
            "prefetch_issued": self.prefetch_issued,
            "prefetch_inserted": issued,
            "prefetch_useful": used,
            "prefetch_precision": used / issued if issued else float("nan"),
            "wasted_prefetch_fraction": 1.0 - (used / issued) if issued else float("nan"),
            "prefetch_skipped_already_cached": self.prefetch_skipped_cached,
            "prefetch_skipped_inflight": self.prefetch_skipped_inflight,
            "origin_queue_wait_seconds_total": self.origin.queue_wait_total,
            "mean_origin_queue_length_at_submit": float(np.mean(self.queue_length_samples))
            if self.queue_length_samples
            else float("nan"),
            "simulated_span_seconds": span,
            "offered_requests_per_second": served / span if span > 0 else float("nan"),
            "policy_counters": self.policy.counters.as_dict(),
        }
