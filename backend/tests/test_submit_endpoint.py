from datetime import date

import pytest

from app.extensions import db
from app.models import Organization, User
from app.repositories.prompt_repository import PromptRepository


# Override conftest's fake-repo client with one backed by the real SQLite app.
@pytest.fixture()
def client(app):
    return app.test_client()


def create_user_and_organization(username="artist", email="artist@example.com"):
    user = User(username=username, email=email, password_hash="hash")
    organization = Organization(name=f"{username} organization")
    db.session.add_all([user, organization])
    db.session.commit()
    return str(user.id), str(organization.id)


def test_submit_endpoint_accepts_today_prompt(client, app):
    with app.app_context():
        user_id, organization_id = create_user_and_organization()

    create_response = client.post(
        "/api/prompts",
        json={
            "title": "Forest creature",
            "description": "Draw a tiny creature hiding in a bright forest.",
            "category": "fantasy",
            "tag": "forest",
        },
    )
    assert create_response.status_code == 201
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
            "image_data": "data:image/png;base64,iVBORw0KGgo=",
            "caption": "first sketch",
        },
    )

    assert submit_response.status_code == 201
    body = submit_response.get_json()
    assert body["submission"]["user_id"] == user_id
    assert body["submission"]["prompt_id"] == prompt_id


def test_submit_endpoint_rejects_non_daily_prompt(client):
    with client.application.app_context():
        user_id, organization_id = create_user_and_organization(
            "second-artist", "second@example.com"
        )

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
            "user_id": user_id,
            "organization_id": organization_id,
            "prompt_id": prompt_id,
            "image_data": "data:image/png;base64,iVBORw0KGgo=",
        },
    )

    # Person 1's ValidationError uses 422 Unprocessable Entity (semantically correct).
    assert submit_response.status_code == 422
    assert "today's prompt" in submit_response.get_json()["error"]
