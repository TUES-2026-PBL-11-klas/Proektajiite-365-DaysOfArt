from datetime import date, datetime, timezone

from .extensions import db


class Prompt(db.Model):
    __tablename__ = "prompts"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=True)
    tag = db.Column(db.String(80), nullable=True)
    organization_id = db.Column(db.Integer, nullable=True, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "tag": self.tag,
            "organization_id": self.organization_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DailyPrompt(db.Model):
    __tablename__ = "daily_prompts"
    __table_args__ = (
        db.UniqueConstraint("prompt_date", "organization_id", name="uq_daily_prompt_org"),
    )

    id = db.Column(db.Integer, primary_key=True)
    prompt_id = db.Column(db.Integer, db.ForeignKey("prompts.id"), nullable=False)
    organization_id = db.Column(db.Integer, nullable=True, index=True)
    prompt_date = db.Column(db.Date, default=date.today, nullable=False, index=True)
    selected_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    prompt = db.relationship("Prompt")

    def to_dict(self):
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "date": self.prompt_date.isoformat(),
            "selected_at": self.selected_at.isoformat() if self.selected_at else None,
            "prompt": self.prompt.to_dict() if self.prompt else None,
        }


class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    organization_id = db.Column(db.Integer, nullable=True, index=True)
    prompt_id = db.Column(db.Integer, db.ForeignKey("prompts.id"), nullable=False)
    image_data = db.Column(db.Text, nullable=False)
    caption = db.Column(db.String(280), nullable=True)
    submitted_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    prompt = db.relationship("Prompt")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "organization_id": self.organization_id,
            "prompt_id": self.prompt_id,
            "caption": self.caption,
            "image_data": self.image_data,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
        }


class UserInteraction(db.Model):
    __tablename__ = "user_interactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("submissions.id"), nullable=False)
    interaction_type = db.Column(db.String(40), nullable=False)
    value = db.Column(db.Float, nullable=False, default=1.0)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    submission = db.relationship("Submission")


class RecommendationScore(db.Model):
    __tablename__ = "recommendation_scores"
    __table_args__ = (
        db.UniqueConstraint("submission_id", name="uq_recommendation_submission"),
    )

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("submissions.id"), nullable=False)
    score = db.Column(db.Float, nullable=False, default=0.0)
    recalculated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    submission = db.relationship("Submission")
