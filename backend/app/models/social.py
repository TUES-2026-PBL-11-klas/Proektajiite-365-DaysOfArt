import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import UniqueConstraint
from app.extensions import db


class Like(db.Model):
    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint("user_id", "submission_id", name="uq_like_user_submission"),
    )

    id            = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id",       ondelete="CASCADE"), nullable=False)
    submission_id = db.Column(UUID(as_uuid=True), db.ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    created_at    = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Comment(db.Model):
    __tablename__ = "comments"

    id            = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id",       ondelete="CASCADE"), nullable=False)
    submission_id = db.Column(UUID(as_uuid=True), db.ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    content       = db.Column(db.Text, nullable=False)
    created_at    = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
