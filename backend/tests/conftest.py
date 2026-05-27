import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.security import PasswordHasher
from app.services import AuthService, UserService, OrganizationService
from tests.fakes import FakeUserRepository, FakeOrganizationRepository, Store


# ── Integration-test fixtures (SQLite in-memory, real ORM) ───────────────────
# Used by Person 3's feed/submission/CLI tests.  The local `client(app)` fixture
# in each of those test files overrides the fake-repo `client` below.

@pytest.fixture
def app():
    from app import create_app
    from app.extensions import db
    application = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def store():
    return Store()


@pytest.fixture
def hasher():
    # Low cost keeps the test suite fast; production uses the default rounds.
    return PasswordHasher(rounds=4)


@pytest.fixture
def user_repo(store):
    return FakeUserRepository(store)


@pytest.fixture
def org_repo(store):
    return FakeOrganizationRepository(store)


@pytest.fixture
def auth_service(user_repo, hasher):
    return AuthService(user_repo, hasher)


@pytest.fixture
def user_service(user_repo):
    return UserService(user_repo)


@pytest.fixture
def organization_service(org_repo, user_repo):
    return OrganizationService(org_repo, user_repo)


@pytest.fixture
def client(store, hasher, monkeypatch):
    """Flask test client wired to the fake repositories. We patch the
    composition root so the real routes/JWT/services run, but data lives in
    memory instead of Postgres — a true end-to-end test of our layer."""
    os.environ.setdefault("DATABASE_URL", "sqlite://")

    def fake_build_services(session=None):
        user_repo = FakeUserRepository(store)
        org_repo = FakeOrganizationRepository(store)
        return {
            "auth": AuthService(user_repo, hasher),
            "users": UserService(user_repo),
            "organizations": OrganizationService(org_repo, user_repo),
        }

    import app.container as container
    import app.routes.auth_routes as auth_routes
    import app.routes.profile_routes as profile_routes
    import app.routes.organization_routes as org_routes

    monkeypatch.setattr(container, "build_services", fake_build_services)
    monkeypatch.setattr(auth_routes, "build_services", fake_build_services)
    monkeypatch.setattr(profile_routes, "build_services", fake_build_services)
    monkeypatch.setattr(org_routes, "build_services", fake_build_services)

    from app import create_app

    app = create_app({"TESTING": True})
    with app.test_client() as test_client:
        yield test_client
