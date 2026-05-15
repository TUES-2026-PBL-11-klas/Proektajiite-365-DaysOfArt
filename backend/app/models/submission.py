import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db


class Submission(db.Model):
    __tablename__ = "submissions"

    id              = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id",         ondelete="CASCADE"), nullable=False)
    topic_id        = db.Column(UUID(as_uuid=True), db.ForeignKey("topics.id",         ondelete="CASCADE"), nullable=False)
    organization_id = db.Column(UUID(as_uuid=True), db.ForeignKey("organizations.id",  ondelete="CASCADE"), nullable=False)
    date            = db.Column(db.Date, nullable=False)
    image_url       = db.Column(db.Text, nullable=False)
    created_at      = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
