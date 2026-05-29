from datetime import date

from app.extensions import db
from app.models import Organization, Topic
from app.repositories.prompt_repository import PromptRepository


def test_daily_prompt_uses_topic_flagged_in_database(app):
    with app.app_context():
        flagged = Topic(
            title="Database topic",
            description="This is the topic explicitly selected in the DB.",
            category="official",
            is_used=True,
            used_on=date.today(),
        )
        unflagged = Topic(
            title="Unflagged topic",
            description="This topic must not override today's flagged topic.",
            category="draft",
            is_used=False,
        )
        db.session.add_all([flagged, unflagged])
        db.session.commit()

        daily_prompt = PromptRepository().get_daily_prompt(prompt_date=date.today())

        assert daily_prompt.prompt_id == flagged.id
        assert daily_prompt.prompt.title == "Database topic"


def test_daily_prompt_is_consistent_across_organizations(app):
    with app.app_context():
        first_org = Organization(name="First")
        second_org = Organization(name="Second")
        flagged = Topic(
            title="Shared daily topic",
            description="Every organization sees the same flagged topic today.",
            category="shared",
            is_used=True,
            used_on=date.today(),
        )
        db.session.add_all([first_org, second_org, flagged])
        db.session.commit()

        repository = PromptRepository()
        first_daily = repository.get_daily_prompt(first_org.id, date.today())
        second_daily = repository.get_daily_prompt(second_org.id, date.today())

        assert first_daily.prompt_id == flagged.id
        assert second_daily.prompt_id == flagged.id
        assert first_daily.prompt.to_dict() == second_daily.prompt.to_dict()
