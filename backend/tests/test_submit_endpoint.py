from datetime import date

from app.repositories.prompt_repository import PromptRepository


def test_submit_endpoint_accepts_today_prompt(client, app):
    create_response = client.post(
        "/api/prompts",
        json={
            "title": "Forest creature",
            "description": "Draw a tiny creature hiding in a bright forest.",
            "category": "fantasy",
            "tag": "forest",
            "organization_id": 10,
        },
    )
    assert create_response.status_code == 201
    prompt_id = create_response.get_json()["prompt"]["id"]

    with app.app_context():
        prompt_repository = PromptRepository()
        prompt = prompt_repository.get_prompt(prompt_id)
        prompt_repository.save_daily_prompt(prompt, 10, date.today())

    submit_response = client.post(
        "/api/submissions",
        json={
            "user_id": 7,
            "organization_id": 10,
            "prompt_id": prompt_id,
            "image_data": "data:image/png;base64,iVBORw0KGgo=",
            "caption": "first sketch",
        },
    )

    assert submit_response.status_code == 201
    body = submit_response.get_json()
    assert body["submission"]["user_id"] == 7
    assert body["submission"]["prompt_id"] == prompt_id


def test_submit_endpoint_rejects_non_daily_prompt(client):
    create_response = client.post(
        "/api/prompts",
        json={
            "title": "Old prompt",
            "description": "This prompt was not selected today.",
        },
    )
    prompt_id = create_response.get_json()["prompt"]["id"]

    submit_response = client.post(
        "/api/submissions",
        json={
            "user_id": 7,
            "prompt_id": prompt_id,
            "image_data": "data:image/png;base64,iVBORw0KGgo=",
        },
    )

    assert submit_response.status_code == 400
    assert "today's prompt" in submit_response.get_json()["error"]
