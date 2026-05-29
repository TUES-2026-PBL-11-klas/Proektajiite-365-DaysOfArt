from datetime import date, datetime, timezone

from sqlalchemy import and_, func

from ..extensions import db
from ..models import RecommendationScore, Submission, UserInteraction
from ..utils import to_uuid


class SubmissionRepository:

    # ------------------------------------------------------------------ writes

    def create_submission(self, user_id, organization_id, prompt_id, image_data, caption=None):
        submission = Submission(
            user_id=to_uuid(user_id),
            organization_id=to_uuid(organization_id),
            topic_id=to_uuid(prompt_id),
            date=date.today(),
            image_url=image_data,
        )
        db.session.add(submission)
        db.session.commit()
        return submission

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

    # --------------------------------------------------------------- existence

    def has_submission_for_prompt_today(self, user_id, prompt_id, current_date=None):
        current_date = current_date or date.today()
        return (
            Submission.query.filter(
                Submission.user_id == to_uuid(user_id),
                Submission.topic_id == to_uuid(prompt_id),
                Submission.date == current_date,
            ).first()
            is not None
        )

    # ----------------------------------------------------------------- lookups

    def get_by_id(self, submission_id):
        return db.session.get(Submission, to_uuid(submission_id))

    def get_submissions_by_ids(self, submission_ids):
        if not submission_ids:
            return []
        return Submission.query.filter(Submission.id.in_(submission_ids)).all()

    def list_submissions(self):
        return Submission.query.all()

    # ------------------------------------------------------- daily feed (Tab 1)
    #
    # Shows submissions made on a specific calendar date (default: today).
    # Scoped to one organisation when organisation_id is given; otherwise the
    # platform-wide view aggregates every organisation.

    def get_feed(self, organization_id=None, feed_date=None, page=1, per_page=20):
        feed_date = feed_date or date.today()
        query = Submission.query.filter(Submission.date == feed_date)
        if organization_id is not None:
            query = query.filter(Submission.organization_id == to_uuid(organization_id))
        query = query.order_by(Submission.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        return items, total

    def get_daily_personalized_feed(self, user_id, organization_id=None, feed_date=None, page=1, per_page=20):
        """Today's submissions ordered by pre-computed recommendation score for the user."""
        feed_date = feed_date or date.today()
        query = (
            db.session.query(Submission)
            .outerjoin(
                RecommendationScore,
                and_(
                    RecommendationScore.submission_id == Submission.id,
                    RecommendationScore.user_id == to_uuid(user_id),
                ),
            )
            .filter(Submission.date == feed_date)
        )
        if organization_id is not None:
            query = query.filter(Submission.organization_id == to_uuid(organization_id))
        query = query.order_by(
            func.coalesce(RecommendationScore.score, 0.0).desc(),
            Submission.created_at.desc(),
        )
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        return items, total

    # ---------------------------------------------------- all-time feed (Tab 2)
    #
    # Submissions from all previous days (date < today).  Today's work appears
    # here automatically at midnight when date.today() advances – no explicit
    # migration or flag flip is required.  The two tabs therefore never overlap.

    def get_all_submissions(self, organization_id=None, page=1, per_page=20):
        """Archived gallery: every submission made on a day before today."""
        query = Submission.query.filter(Submission.date < date.today())
        if organization_id is not None:
            query = query.filter(Submission.organization_id == to_uuid(organization_id))
        query = query.order_by(Submission.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        return items, total

    def get_all_time_personalized(self, user_id, organization_id=None, page=1, per_page=20):
        """Archived gallery ordered by the recommendation engine for this user.

        Submissions without a pre-computed score fall back to 0.0 and are then
        sorted by recency, so new users still receive a sensible ordering.
        """
        query = (
            db.session.query(Submission)
            .outerjoin(
                RecommendationScore,
                and_(
                    RecommendationScore.submission_id == Submission.id,
                    RecommendationScore.user_id == to_uuid(user_id),
                ),
            )
            .filter(Submission.date < date.today())
        )
        if organization_id is not None:
            query = query.filter(Submission.organization_id == to_uuid(organization_id))
        query = query.order_by(
            func.coalesce(RecommendationScore.score, 0.0).desc(),
            Submission.created_at.desc(),
        )
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        return items, total

    # -------------------------------------- archive / end-of-day stats helpers

    def count_submissions_for_date(self, target_date):
        """Returns how many submissions were made on target_date.

        Used by the archive endpoint to confirm that a day's work has transitioned
        into the gallery pool (which happens automatically at midnight).
        """
        return Submission.query.filter(Submission.date == target_date).count()

    # ------------------------------------------------------- user drawing history

    def get_user_submissions(self, user_id, filter_date=None, page=1, per_page=20):
        """All submissions by a user, newest first.

        Pass filter_date to show only the drawings made on a specific day –
        this powers the 'pick a day' history view in the user profile.
        """
        query = Submission.query.filter(Submission.user_id == to_uuid(user_id))
        if filter_date is not None:
            query = query.filter(Submission.date == filter_date)
        query = query.order_by(Submission.date.desc(), Submission.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        return items, total

    # ---------------------------------------- interaction data for CF engine

    def get_interaction_matrix(self):
        """Aggregate interaction scores per (user, submission) pair."""
        return (
            db.session.query(
                UserInteraction.user_id,
                UserInteraction.submission_id,
                func.coalesce(func.sum(UserInteraction.total_score), 0.0).label("score"),
            )
            .group_by(UserInteraction.user_id, UserInteraction.submission_id)
            .all()
        )

    # kept for backward compatibility with the cron job (Person 2)
    def calculate_interaction_scores(self):
        return self.get_interaction_matrix()

    def record_interaction(self, user_id, submission_id, interaction_type, weight):
        user_uuid = to_uuid(user_id)
        submission_uuid = to_uuid(submission_id)
        existing = UserInteraction.query.filter_by(
            user_id=user_uuid,
            submission_id=submission_uuid,
        ).first()

        if existing is None:
            existing = UserInteraction(
                user_id=user_uuid,
                submission_id=submission_uuid,
                like_score=0.0,
                comment_score=0.0,
                view_score=0.0,
                total_score=0.0,
            )
            db.session.add(existing)

        if interaction_type in {"like", "unlike"}:
            existing.like_score = (existing.like_score or 0.0) + weight
        elif interaction_type == "comment":
            existing.comment_score = (existing.comment_score or 0.0) + weight
        elif interaction_type == "view":
            existing.view_score = (existing.view_score or 0.0) + weight

        existing.total_score = (
            (existing.like_score or 0.0)
            + (existing.comment_score or 0.0)
            + (existing.view_score or 0.0)
        )
        db.session.commit()
        return existing

    def get_users_who_interacted_with(self, submission_id):
        return (
            db.session.query(UserInteraction.user_id, UserInteraction.total_score)
            .filter(UserInteraction.submission_id == to_uuid(submission_id))
            .all()
        )

    def get_interactions_for_users(self, user_ids):
        if not user_ids:
            return []
        return (
            UserInteraction.query
            .filter(UserInteraction.user_id.in_(user_ids))
            .all()
        )
