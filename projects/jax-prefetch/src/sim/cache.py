from collections import OrderedDict
from dataclasses import dataclass


@dataclass
class CacheEntry:
    inserted_at: float
    prefetched: bool
    used_by_real_request: bool


class LruTtlCache:
    def __init__(self, capacity_entries: int, ttl_seconds: float) -> None:
        self.capacity_entries = capacity_entries
        self.ttl_seconds = ttl_seconds
        self.entries: OrderedDict[int, CacheEntry] = OrderedDict()
        self.hits = 0
        self.misses = 0
        self.expired_lookups = 0
        self.evictions = 0
        self.prefetched_inserted = 0
        self.prefetched_used = 0
        self.prefetched_discarded_unused = 0

    def occupancy_fraction(self) -> float:
        return len(self.entries) / self.capacity_entries

    def _retire(self, key: int, entry: CacheEntry) -> None:
        if entry.prefetched and not entry.used_by_real_request:
            self.prefetched_discarded_unused += 1

    def contains_fresh(self, key: int, now: float) -> bool:
        entry = self.entries.get(key)
        if entry is None:
            return False
        if now - entry.inserted_at > self.ttl_seconds:
            return False
        return True

    def lookup(self, key: int, now: float) -> CacheEntry | None:
        entry = self.entries.get(key)
        if entry is None:
            self.misses += 1
            return None
        if now - entry.inserted_at > self.ttl_seconds:
            self.entries.pop(key)
            self._retire(key, entry)
            self.expired_lookups += 1
            self.misses += 1
            return None
        self.entries.move_to_end(key)
        self.hits += 1
        if entry.prefetched and not entry.used_by_real_request:
            entry.used_by_real_request = True
            self.prefetched_used += 1
        return entry

    def insert(self, key: int, now: float, prefetched: bool) -> None:
        existing = self.entries.pop(key, None)
        if existing is not None:
            self._retire(key, existing)
        self.entries[key] = CacheEntry(inserted_at=now, prefetched=prefetched, used_by_real_request=False)
        if prefetched:
            self.prefetched_inserted += 1
        while len(self.entries) > self.capacity_entries:
            evicted_key, evicted = self.entries.popitem(last=False)
            self.evictions += 1
            self._retire(evicted_key, evicted)

    def drain(self) -> None:
        for key, entry in list(self.entries.items()):
            self._retire(key, entry)
        self.entries.clear()
