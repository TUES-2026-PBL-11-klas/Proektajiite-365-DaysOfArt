from queue import Empty, Queue
from typing import Generic, Optional, TypeVar

T = TypeVar("T")


class PromptQueue(Generic[T]):
    def __init__(self):
        self._queue = Queue()

    def put(self, item: T):
        self._queue.put(item)

    def get(self, timeout=1) -> Optional[T]:
        try:
            return self._queue.get(timeout=timeout)
        except Empty:
            return None

    def mark_done(self):
        self._queue.task_done()

    def join(self):
        self._queue.join()
