from datetime import date, datetime, time, timezone

from sqlalchemy import func

from ..extensions import db
from ..models import RecommendationScore, Submission, UserInteraction


class SubmissionRepository:
    def create_submission(self, user_id, organization_id, prompt_id, image_data, caption=None):
        submission = Submission(
            user_id=user_id,
            organization_id=organization_id,
            prompt_id=prompt_id,
            image_data=image_data,
            caption=caption,
        )
        db.session.add(submission)
        db.session.commit()
        return submission

    def has_submission_for_prompt_today(self, user_id, prompt_id, current_date=None):
        current_date = current_date or date.today()
        start = datetime.combine(current_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(current_date, time.max, tzinfo=timezone.utc)
        return (
            Submission.query.filter(
                Submission.user_id == user_id,
                Submission.prompt_id == prompt_id,
                Submission.submitted_at >= start,
                Submission.submitted_at <= end,
            ).first()
            is not None
        )

    def list_submissions(self):
        return Submission.query.all()

    def calculate_interaction_scores(self):
        return (
            db.session.query(
                UserInteraction.submission_id,
                func.coalesce(func.sum(UserInteraction.value), 0.0).label("score"),
            )
            .group_by(UserInteraction.submission_id)
            .all()
        )

    def upsert_recommendation_score(self, submission_id, score):
        existing = RecommendationScore.query.filter_by(submission_id=submission_id).first()
        if existing:
            existing.score = score
            existing.recalculated_at = datetime.now(timezone.utc)
        else:
            existing = RecommendationScore(submission_id=submission_id, score=score)
            db.session.add(existing)
        db.session.commit()
        return existing
