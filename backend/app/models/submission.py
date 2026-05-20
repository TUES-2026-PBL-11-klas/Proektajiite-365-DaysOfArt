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

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "organization_id": str(self.organization_id),
            "prompt_id": str(self.topic_id),
            "topic_id": str(self.topic_id),
            "image_data": self.image_url,
            "image_url": self.image_url,
            "caption": None,
            "date": self.date.isoformat() if self.date else None,
            "submitted_at": self.created_at.isoformat() if self.created_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
