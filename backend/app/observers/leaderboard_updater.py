import logging

from .base import LikeObserver

logger = logging.getLogger(__name__)


class LeaderboardUpdater(LikeObserver):
    """Invalidates / refreshes the leaderboard cache when likes change."""

    def __init__(self, social_repository):
        self._repo = social_repository

    def on_like_added(self, user_id: str, submission_id: str) -> None:
        logger.info(
            "leaderboard.like_added",
            extra={"user_id": user_id, "submission_id": submission_id},
        )

    def on_like_removed(self, user_id: str, submission_id: str) -> None:
        logger.info(
            "leaderboard.like_removed",
            extra={"user_id": user_id, "submission_id": submission_id},
        )
