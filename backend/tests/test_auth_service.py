import pytest
from app.exceptions import (
    UserAlreadyExistsError,
    InvalidCredentialsError,
    ValidationError,
    UserNotFoundError,
)


def test_register_creates_hashed_user(auth_service, store):
    user = auth_service.register("alice", "alice@example.com", "supersecret")

    assert user.username == "alice"
    assert user.email == "alice@example.com"
    assert user.password_hash != "supersecret"
    assert user.display_name == "alice"
    assert str(user.id) in store.users


def test_register_duplicate_username_or_email(auth_service):
    auth_service.register("bob", "bob@example.com", "supersecret")
    with pytest.raises(UserAlreadyExistsError):
        auth_service.register("bob", "other@example.com", "supersecret")


def test_register_rejects_short_password(auth_service):
    with pytest.raises(ValidationError):
        auth_service.register("carol", "carol@example.com", "short")


def test_register_rejects_invalid_email(auth_service):
    with pytest.raises(ValidationError):
        auth_service.register("dave", "not-an-email", "supersecret")


def test_authenticate_success(auth_service):
    auth_service.register("erin", "erin@example.com", "supersecret")
    user = auth_service.authenticate("erin@example.com", "supersecret")
    assert user.username == "erin"


def test_authenticate_wrong_password(auth_service):
    auth_service.register("frank", "frank@example.com", "supersecret")
    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate("frank@example.com", "wrongpass")


def test_authenticate_unknown_user(auth_service):
    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate("ghost@example.com", "supersecret")


def test_change_password_updates_hash(auth_service):
    user = auth_service.register("gina", "gina@example.com", "supersecret")
    old_hash = user.password_hash

    auth_service.change_password(str(user.id), "supersecret", "newsupersecret")

    assert user.password_hash != old_hash
    assert auth_service.authenticate("gina@example.com", "newsupersecret")


def test_change_password_wrong_current(auth_service):
    user = auth_service.register("hank", "hank@example.com", "supersecret")
    with pytest.raises(InvalidCredentialsError):
        auth_service.change_password(str(user.id), "wrongpass", "newsupersecret")


def test_change_password_unknown_user(auth_service):
    with pytest.raises(UserNotFoundError):
        auth_service.change_password("00000000-0000-0000-0000-000000000000", "x", "y")
