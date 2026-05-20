from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import func

from ..extensions import db
from ..models import RecommendationScore, Submission, UserInteraction


def _uuid(value):
    if isinstance(value, UUID):
        return value
    return UUID(str(value))


class SubmissionRepository:
    def create_submission(self, user_id, organization_id, prompt_id, image_data, caption=None):
        submission = Submission(
            user_id=_uuid(user_id),
            organization_id=_uuid(organization_id),
            topic_id=_uuid(prompt_id),
            date=date.today(),
            image_url=image_data,
        )
        db.session.add(submission)
        db.session.commit()
        return submission

    def has_submission_for_prompt_today(self, user_id, prompt_id, current_date=None):
        current_date = current_date or date.today()
        return (
            Submission.query.filter(
                Submission.user_id == _uuid(user_id),
                Submission.topic_id == _uuid(prompt_id),
                Submission.date == current_date,
            ).first()
            is not None
        )

    def list_submissions(self):
        return Submission.query.all()

    def calculate_interaction_scores(self):
        return (
            db.session.query(
                UserInteraction.user_id,
                UserInteraction.submission_id,
                func.coalesce(func.sum(UserInteraction.total_score), 0.0).label("score"),
            )
            .group_by(UserInteraction.user_id, UserInteraction.submission_id)
            .all()
        )

    def upsert_recommendation_score(self, user_id, submission_id, score):
        existing = RecommendationScore.query.filter_by(
            user_id=user_id, submission_id=submission_id
        ).first()
        if existing:
            existing.score = score
            existing.computed_at = datetime.now(timezone.utc)
        else:
            existing = RecommendationScore(
                user_id=user_id,
                submission_id=submission_id,
                score=score,
            )
            db.session.add(existing)
        db.session.commit()
        return existing
