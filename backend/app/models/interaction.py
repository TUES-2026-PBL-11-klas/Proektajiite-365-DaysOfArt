import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import UniqueConstraint
from app.extensions import db


class UserInteraction(db.Model):
    __tablename__ = "user_interactions"
    __table_args__ = (
        UniqueConstraint("user_id", "submission_id", name="uq_interaction_user_submission"),
    )

    id            = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id",       ondelete="CASCADE"), nullable=False)
    submission_id = db.Column(UUID(as_uuid=True), db.ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    like_score    = db.Column(db.Float)
    comment_score = db.Column(db.Float)
    view_score    = db.Column(db.Float)
    total_score   = db.Column(db.Float)
    updated_at    = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))


class RecommendationScore(db.Model):
    __tablename__ = "recommendation_scores"
    __table_args__ = (
        UniqueConstraint("user_id", "submission_id", name="uq_rec_score_user_submission"),
    )

    id            = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id",       ondelete="CASCADE"), nullable=False)
    submission_id = db.Column(UUID(as_uuid=True), db.ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    score         = db.Column(db.Float, nullable=False)
    computed_at   = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
