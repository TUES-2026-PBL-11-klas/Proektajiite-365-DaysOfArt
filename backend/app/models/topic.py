import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db


class Topic(db.Model):
    __tablename__ = "topics"

    id          = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title       = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category    = db.Column(db.String(100))
    is_used     = db.Column(db.Boolean, nullable=False)
    used_on     = db.Column(db.Date)
    created_at  = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
