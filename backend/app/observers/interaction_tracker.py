import logging

from .base import LikeObserver

logger = logging.getLogger(__name__)


class InteractionTracker(LikeObserver):
    """Records interactions so the recommendation engine can use them immediately."""

    def __init__(self, submission_repository):
        self._repo = submission_repository

    def _record_and_persist(self, user_id: str, submission_id: str, interaction_type: str, weight: float) -> None:
        interaction = self._repo.record_interaction(
            user_id=user_id,
            submission_id=submission_id,
            interaction_type=interaction_type,
            weight=weight,
        )
        score = float(interaction.total_score or 0.0)
        if score > 0:
            self._repo.upsert_recommendation_score(user_id, submission_id, score)

    def on_like_added(self, user_id: str, submission_id: str) -> None:
        try:
            self._record_and_persist(user_id, submission_id, "like", 1.0)
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
            self._record_and_persist(user_id, submission_id, "unlike", -1.0)
            logger.info(
                "interaction.unlike_recorded",
                extra={"user_id": user_id, "submission_id": submission_id},
            )
        except Exception:
            logger.exception(
                "interaction.unlike_record_failed",
                extra={"user_id": user_id, "submission_id": submission_id},
            )

    def on_comment_added(self, user_id: str, submission_id: str) -> None:
        try:
            self._record_and_persist(user_id, submission_id, "comment", 2.0)
            logger.info(
                "interaction.comment_recorded",
                extra={"user_id": user_id, "submission_id": submission_id},
            )
        except Exception:
            logger.exception(
                "interaction.comment_record_failed",
                extra={"user_id": user_id, "submission_id": submission_id},
            )