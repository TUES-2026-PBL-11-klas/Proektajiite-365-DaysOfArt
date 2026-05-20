from datetime import date
from random import choice
from uuid import UUID

from ..extensions import db
from ..models import Organization, Topic


def _uuid_or_none(value):
    if value is None or isinstance(value, UUID):
        return value
    return UUID(str(value))


class DailyPromptView:
    def __init__(self, topic, organization_id=None, prompt_date=None):
        self.topic = topic
        self.prompt = topic
        self.id = topic.id
        self.prompt_id = topic.id
        self.organization_id = organization_id
        self.prompt_date = prompt_date or topic.used_on
        self.selected_at = topic.created_at

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id)
            if self.organization_id is not None
            else None,
            "date": self.prompt_date.isoformat() if self.prompt_date else None,
            "selected_at": self.selected_at.isoformat() if self.selected_at else None,
            "prompt": self.prompt.to_dict(),
        }


class PromptRepository:
    def create_prompt(self, title, description, category=None, tag=None, organization_id=None):
        prompt = Topic(
            title=title,
            description=description,
            category=category,
            is_used=False,
        )
        db.session.add(prompt)
        db.session.commit()
        return prompt

    def get_prompt(self, prompt_id):
        return db.session.get(Topic, _uuid_or_none(prompt_id))

    def get_daily_prompt(self, organization_id=None, prompt_date=None):
        prompt_date = prompt_date or date.today()
        topic = Topic.query.filter(Topic.used_on == prompt_date).first()
        if topic is None:
            return None
        return DailyPromptView(topic, organization_id, prompt_date)

    def choose_random_prompt(self, organization_id=None, excluded_prompt_ids=None):
        excluded_prompt_ids = excluded_prompt_ids or []
        query = Topic.query.filter(Topic.is_used.is_(False))
        if excluded_prompt_ids:
            query = query.filter(Topic.id.notin_(excluded_prompt_ids))

        prompts = query.all()
        return choice(prompts) if prompts else None

    def save_daily_prompt(self, prompt, organization_id=None, prompt_date=None):
        prompt.is_used = True
        prompt.used_on = prompt_date or date.today()
        db.session.commit()
        return DailyPromptView(prompt, organization_id, prompt.used_on)

    def list_organization_ids_with_prompts(self):
        organization_ids = [row[0] for row in db.session.query(Organization.id).all()]
        return organization_ids or [None]
