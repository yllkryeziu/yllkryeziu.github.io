from collections import deque
from dataclasses import dataclass


@dataclass
class OriginJob:
    key: int
    is_prefetch: bool
    enqueued_at: float
    response_bytes: float
    decision_index: int


class Origin:
    def __init__(self, concurrency: int) -> None:
        self.concurrency = concurrency
        self.busy = 0
        self.queue: deque[OriginJob] = deque()
        self.jobs_started = 0
        self.jobs_real = 0
        self.jobs_prefetch = 0
        self.queue_wait_total = 0.0

    def queue_length(self) -> int:
        return len(self.queue) + self.busy

    def submit(self, job: OriginJob) -> OriginJob | None:
        self.jobs_started += 1
        if job.is_prefetch:
            self.jobs_prefetch += 1
        else:
            self.jobs_real += 1
        if self.busy < self.concurrency:
            self.busy += 1
            return job
        self.queue.append(job)
        return None

    def release(self, now: float) -> OriginJob | None:
        if self.queue:
            job = self.queue.popleft()
            self.queue_wait_total += now - job.enqueued_at
            return job
        self.busy -= 1
        return None
