from app.models import User
from app.security import PasswordHasher


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _seed_admin(store, password="adminpass"):
    """Insert an admin user directly into the test store so we can authenticate
    as them and exercise admin-only endpoints."""
    hasher = PasswordHasher(rounds=4)
    user = User(
        username="root",
        email="root@example.com",
        password_hash=hasher.hash(password),
        display_name="Root",
        role="admin",
    )
    from tests.fakes import FakeUserRepository

    FakeUserRepository(store).add(user)
    return user, password


def _login(client, email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.get_json()["access_token"]


def test_register_login_join_flow(client, store):
    # 0. Pre-seed an admin and have them create an organization.
    _, admin_pw = _seed_admin(store)
    admin_token = _login(client, "root@example.com", admin_pw)
    resp = client.post(
        "/api/organizations",
        json={"name": "Juniors", "min_age": 10, "max_age": 16},
        headers=_auth_header(admin_token),
    )
    assert resp.status_code == 201
    org_id = resp.get_json()["id"]

    # 1. Register a new user
    resp = client.post(
        "/api/auth/register",
        json={
            "username": "newbie",
            "email": "newbie@example.com",
            "password": "supersecret",
            "birth_date": "2010-05-01",
        },
    )
    assert resp.status_code == 201
    user_token = resp.get_json()["access_token"]
    assert resp.get_json()["user"]["role"] == "user"

    # 2. Login (verifies authenticate works too)
    user_token = _login(client, "newbie@example.com", "supersecret")

    # 3. Join the existing organization
    resp = client.post(
        f"/api/organizations/{org_id}/join", headers=_auth_header(user_token)
    )
    assert resp.status_code == 200

    # 4. Verify the membership shows up
    resp = client.get("/api/organizations/mine", headers=_auth_header(user_token))
    names = [o["name"] for o in resp.get_json()["organizations"]]
    assert "Juniors" in names


def test_login_with_wrong_password_returns_401(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "secure",
            "email": "secure@example.com",
            "password": "supersecret",
        },
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "secure@example.com", "password": "wrong"},
    )
    assert resp.status_code == 401


def test_profile_requires_auth(client):
    resp = client.get("/api/profile")
    assert resp.status_code == 401


def test_logout_revokes_token(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "tmp",
            "email": "tmp@example.com",
            "password": "supersecret",
        },
    )
    token = _login(client, "tmp@example.com", "supersecret")
    assert client.get("/api/profile", headers=_auth_header(token)).status_code == 200
    assert (
        client.post("/api/auth/logout", headers=_auth_header(token)).status_code == 200
    )
    # Token is now revoked
    assert client.get("/api/profile", headers=_auth_header(token)).status_code == 401


def test_non_admin_cannot_create_organization(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "plain",
            "email": "plain@example.com",
            "password": "supersecret",
        },
    )
    token = _login(client, "plain@example.com", "supersecret")
    resp = client.post(
        "/api/organizations",
        json={"name": "Hacked", "min_age": 18, "max_age": 99},
        headers=_auth_header(token),
    )
    assert resp.status_code == 403


def test_change_password_flow(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "rotate",
            "email": "rotate@example.com",
            "password": "oldpassword1",
        },
    )
    token = _login(client, "rotate@example.com", "oldpassword1")

    resp = client.post(
        "/api/auth/change-password",
        json={"current_password": "oldpassword1", "new_password": "newpassword2"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 200

    assert _login(client, "rotate@example.com", "newpassword2")
    resp = client.post(
        "/api/auth/login",
        json={"email": "rotate@example.com", "password": "oldpassword1"},
    )
    assert resp.status_code == 401


def test_suggest_endpoint(client, store):
    _, admin_pw = _seed_admin(store)
    admin_token = _login(client, "root@example.com", admin_pw)
    client.post(
        "/api/organizations",
        json={"name": "Kids", "min_age": 6, "max_age": 12},
        headers=_auth_header(admin_token),
    )
    client.post(
        "/api/organizations",
        json={"name": "Teens", "min_age": 13, "max_age": 18},
        headers=_auth_header(admin_token),
    )

    resp = client.get("/api/organizations/suggest?age=10")
    assert resp.status_code == 200
    names = [o["name"] for o in resp.get_json()["organizations"]]
    assert names == ["Kids"]
