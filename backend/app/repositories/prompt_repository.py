from datetime import date
from random import choice

from sqlalchemy import or_

from ..extensions import db
from ..models import DailyPrompt, Prompt


class PromptRepository:
    def create_prompt(self, title, description, category=None, tag=None, organization_id=None):
        prompt = Prompt(
            title=title,
            description=description,
            category=category,
            tag=tag,
            organization_id=organization_id,
        )
        db.session.add(prompt)
        db.session.commit()
        return prompt

    def get_prompt(self, prompt_id):
        return db.session.get(Prompt, prompt_id)

    def get_daily_prompt(self, organization_id=None, prompt_date=None):
        prompt_date = prompt_date or date.today()
        query = DailyPrompt.query.filter(DailyPrompt.prompt_date == prompt_date)
        if organization_id is None:
            query = query.filter(DailyPrompt.organization_id.is_(None))
        else:
            query = query.filter(DailyPrompt.organization_id == organization_id)
        return query.first()

    def choose_random_prompt(self, organization_id=None, excluded_prompt_ids=None):
        excluded_prompt_ids = excluded_prompt_ids or []
        query = Prompt.query
        if organization_id is None:
            query = query.filter(Prompt.organization_id.is_(None))
        else:
            query = query.filter(
                or_(Prompt.organization_id == organization_id, Prompt.organization_id.is_(None))
            )
        if excluded_prompt_ids:
            query = query.filter(Prompt.id.notin_(excluded_prompt_ids))

        prompts = query.all()
        return choice(prompts) if prompts else None

    def save_daily_prompt(self, prompt, organization_id=None, prompt_date=None):
        daily_prompt = DailyPrompt(
            prompt=prompt,
            organization_id=organization_id,
            prompt_date=prompt_date or date.today(),
        )
        db.session.add(daily_prompt)
        db.session.commit()
        return daily_prompt

    def list_organization_ids_with_prompts(self):
        rows = db.session.query(Prompt.organization_id).distinct().all()
        return [row[0] for row in rows]
