from datetime import date

from app.models import DailyPrompt, RecommendationScore
from app.repositories.prompt_repository import PromptRepository


def test_select_daily_prompts_cli_creates_daily_prompt(app):
    with app.app_context():
        PromptRepository().create_prompt(
            title="Mountain shapes",
            description="Draw mountains using only simple geometric shapes.",
            organization_id=3,
        )

    result = app.test_cli_runner().invoke(
        args=["select-daily-prompts", "--date", date.today().isoformat()]
    )

    assert result.exit_code == 0
    assert "Selected 1 daily prompts." in result.output
    with app.app_context():
        assert DailyPrompt.query.filter_by(organization_id=3).count() == 1


def test_run_daily_cron_cli_recalculates_recommendation_scores(client, app):
    create_response = client.post(
        "/api/prompts",
        json={
            "title": "Robot city",
            "description": "Draw a small robot walking through a city.",
            "organization_id": 4,
        },
    )
    prompt_id = create_response.get_json()["prompt"]["id"]

    with app.app_context():
        prompt_repository = PromptRepository()
        prompt = prompt_repository.get_prompt(prompt_id)
        prompt_repository.save_daily_prompt(prompt, 4, date.today())

    submit_response = client.post(
        "/api/submissions",
        json={
            "user_id": 22,
            "organization_id": 4,
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
