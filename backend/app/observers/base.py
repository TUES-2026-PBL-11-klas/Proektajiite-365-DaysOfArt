from abc import ABC, abstractmethod


class LikeObserver(ABC):
    """Abstract base class for all like observers."""

    @abstractmethod
    def on_like_added(self, user_id: str, submission_id: str) -> None:
        """Called when a like is added."""

    @abstractmethod
    def on_like_removed(self, user_id: str, submission_id: str) -> None:
        """Called when a like is removed."""