from datetime import date

from app.extensions import db
from app.models import Organization, RecommendationScore, Topic, User
from app.repositories.prompt_repository import PromptRepository


def create_user_and_organization():
    user = User(
        username="artist",
        email="artist@example.com",
        password_hash="hash",
    )
    organization = Organization(name="Teen artists", min_age=13, max_age=19)
    db.session.add_all([user, organization])
    db.session.commit()
    return user, organization


def test_select_daily_prompts_cli_creates_daily_prompt(app):
    with app.app_context():
        create_user_and_organization()
        PromptRepository().create_prompt(
            title="Mountain shapes",
            description="Draw mountains using only simple geometric shapes.",
        )

    result = app.test_cli_runner().invoke(
        args=["select-daily-prompts", "--date", date.today().isoformat()]
    )

    assert result.exit_code == 0
    assert "Selected 1 daily prompts." in result.output
    with app.app_context():
        assert Topic.query.filter_by(used_on=date.today()).count() == 1


def test_run_daily_cron_cli_recalculates_recommendation_scores(client, app):
    with app.app_context():
        user, organization = create_user_and_organization()
        user_id = str(user.id)
        organization_id = str(organization.id)

    create_response = client.post(
        "/api/prompts",
        json={
            "title": "Robot city",
            "description": "Draw a small robot walking through a city.",
        },
    )
    prompt_id = create_response.get_json()["prompt"]["id"]

    with app.app_context():
        prompt_repository = PromptRepository()
        prompt = prompt_repository.get_prompt(prompt_id)
        prompt_repository.save_daily_prompt(prompt, organization_id, date.today())

    submit_response = client.post(
        "/api/submissions",
        json={
            "user_id": user_id,
            "organization_id": organization_id,
            "prompt_id": prompt_id,
            "image_data": "data:image/png;base64,robot",
        },
    )
    assert submit_response.status_code == 201

    result = app.test_cli_runner().invoke(
        args=["run-daily-cron", "--date", date.today().isoformat()]
    )

    assert result.exit_code == 0
    assert "Daily cron completed:" in result.output
    with app.app_context():
        assert RecommendationScore.query.count() == 1
        assert RecommendationScore.query.first().score == 0.1
