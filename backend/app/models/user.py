import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username      = db.Column(db.String(50),  nullable=False, unique=True)
    email         = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.String(20),  nullable=False, default="user")
    display_name  = db.Column(db.String(100))
    bio           = db.Column(db.Text)
    avatar_url    = db.Column(db.Text)
    birth_date    = db.Column(db.Date)
    created_at    = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at    = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))
