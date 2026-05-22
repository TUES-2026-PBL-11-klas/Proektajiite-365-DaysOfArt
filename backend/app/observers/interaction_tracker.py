import logging

from .base import LikeObserver

logger = logging.getLogger(__name__)


class InteractionTracker(LikeObserver):
    """Records like interactions so the recommendation engine can use them."""

    def __init__(self, submission_repository):
        self._repo = submission_repository

    def on_like_added(self, user_id: str, submission_id: str) -> None:
        try:
            self._repo.record_interaction(
                user_id=user_id,
                submission_id=submission_id,
                interaction_type="like",
                weight=1.0,
            )
            logger.info(
                "interaction.like_recorded",
                extra={"user_id": user_id, "submission_id": submission_id},
            )
        except Exception:
            logger.exception(
                "interaction.like_record_failed",
                extra={"user_id": user_id, "submission_id": submission_id},
            )

    def on_like_removed(self, user_id: str, submission_id: str) -> None:
        try:
            self._repo.record_interaction(
                user_id=user_id,
                submission_id=submission_id,
                interaction_type="unlike",
                weight=-1.0,
            )
            logger.info(
                "interaction.unlike_recorded",
                extra={"user_id": user_id, "submission_id": submission_id},
            )
        except Exception:
            logger.exception(
                "interaction.unlike_record_failed",
                extra={"user_id": user_id, "submission_id": submission_id},
            )