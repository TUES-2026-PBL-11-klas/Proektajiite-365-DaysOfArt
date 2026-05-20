import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db


class Organization(db.Model):
    __tablename__ = "organizations"

    id          = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = db.Column(db.String(100), nullable=False)
    min_age     = db.Column(db.Integer)
    max_age     = db.Column(db.Integer)
    description = db.Column(db.Text)
    created_at  = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class UserOrganization(db.Model):
    __tablename__ = "user_organizations"

    user_id         = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False)
    organization_id = db.Column(UUID(as_uuid=True), db.ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True, nullable=False)
    joined_at       = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
