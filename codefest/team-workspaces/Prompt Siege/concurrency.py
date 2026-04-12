import os
import threading
from contextlib import contextmanager


DEFAULT_MAX_PARALLEL_REQUESTS = 4

_REQUEST_SEMAPHORE: threading.BoundedSemaphore | None = None
_REQUEST_SEMAPHORE_SIZE: int | None = None
_REQUEST_SEMAPHORE_LOCK = threading.Lock()


def max_parallel_requests() -> int:
    raw_value = os.getenv(
        "MAX_PARALLEL_REQUESTS",
        str(DEFAULT_MAX_PARALLEL_REQUESTS),
    )
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError("MAX_PARALLEL_REQUESTS must be an integer >= 1.") from exc

    if value < 1:
        raise ValueError("MAX_PARALLEL_REQUESTS must be >= 1.")
    return value


def _request_semaphore() -> threading.BoundedSemaphore:
    global _REQUEST_SEMAPHORE, _REQUEST_SEMAPHORE_SIZE

    size = max_parallel_requests()
    with _REQUEST_SEMAPHORE_LOCK:
        if _REQUEST_SEMAPHORE is None or _REQUEST_SEMAPHORE_SIZE != size:
            _REQUEST_SEMAPHORE = threading.BoundedSemaphore(size)
            _REQUEST_SEMAPHORE_SIZE = size
        return _REQUEST_SEMAPHORE


@contextmanager
def request_slot():
    semaphore = _request_semaphore()
    semaphore.acquire()
    try:
        yield
    finally:
        semaphore.release()
