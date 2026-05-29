from datetime import date
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models.social import Comment, Like
from ..models.submission import Submission


def _uuid(value):
    if isinstance(value, UUID):
        return value
    return UUID(str(value))


class SocialRepository:

    def get_submission(self, submission_id):
        return db.session.get(Submission, _uuid(submission_id))

    def add_like(self, user_id, submission_id):
        like = Like(user_id=_uuid(user_id), submission_id=_uuid(submission_id))
        db.session.add(like)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Already liked")
        return like

    def remove_like(self, user_id, submission_id):
        like = Like.query.filter_by(
            user_id=_uuid(user_id), submission_id=_uuid(submission_id)
        ).first()
        if not like:
            raise ValueError("Like not found")
        db.session.delete(like)
        db.session.commit()

    def is_liked_by_user(self, user_id, submission_id):
        if not user_id:
            return False
        return (
            Like.query.filter_by(
                user_id=_uuid(user_id), submission_id=_uuid(submission_id)
            ).first()
            is not None
        )

    def count_likes(self, submission_id):
        return Like.query.filter_by(submission_id=_uuid(submission_id)).count()

    def add_comment(self, user_id, submission_id, content):
        comment = Comment(
            user_id=_uuid(user_id),
            submission_id=_uuid(submission_id),
            content=content,
        )
        db.session.add(comment)
        db.session.commit()
        return comment

    def get_comments(self, submission_id):
        return (
            Comment.query.filter_by(submission_id=_uuid(submission_id))
            .order_by(Comment.created_at.asc())
            .all()
        )


    def get_top_submissions_today(self, organization_id, limit=10):
        today = date.today()
        like_counts = (
            db.session.query(
                Like.submission_id,
                func.count(Like.id).label("like_count"),
            )
            .join(Submission, Submission.id == Like.submission_id)
            .filter(
                Submission.date == today,
                Submission.organization_id == _uuid(organization_id),
            )
            .group_by(Like.submission_id)
            .order_by(func.count(Like.id).desc())
            .limit(limit)
            .all()
        )

        results = []
        for row in like_counts:
            submission = db.session.get(Submission, row.submission_id)
            if submission:
                entry = submission.to_dict()
                entry["like_count"] = row.like_count
                results.append(entry)
        return results
