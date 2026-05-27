from datetime import date
import pytest
from app.models import User
from app.exceptions import (
    OrganizationNotFoundError,
    AlreadyMemberError,
    NotMemberError,
    AgeNotAllowedError,
    ValidationError,
    ForbiddenError,
)


def _make_user(user_repo, *, role="user", birth_date=None, suffix=""):
    user = User(
        username=f"u{suffix}",
        email=f"u{suffix}@example.com",
        password_hash="x",
        role=role,
        birth_date=birth_date,
    )
    return user_repo.add(user)


def _admin(user_repo):
    return _make_user(user_repo, role="admin", suffix="-admin")


def test_create_organization_as_admin(organization_service, user_repo):
    admin = _admin(user_repo)
    org = organization_service.create(str(admin.id), "Kids", min_age=6, max_age=12)
    assert org.name == "Kids"
    assert org.min_age == 6


def test_create_rejected_for_non_admin(organization_service, user_repo):
    user = _make_user(user_repo)
    with pytest.raises(ForbiddenError):
        organization_service.create(str(user.id), "Kids", min_age=6, max_age=12)


def test_create_rejects_blank_name(organization_service, user_repo):
    admin = _admin(user_repo)
    with pytest.raises(ValidationError):
        organization_service.create(str(admin.id), "   ")


def test_create_rejects_inverted_age_range(organization_service, user_repo):
    admin = _admin(user_repo)
    with pytest.raises(ValidationError):
        organization_service.create(str(admin.id), "Bad", min_age=20, max_age=10)


def test_update_organization(organization_service, user_repo):
    admin = _admin(user_repo)
    org = organization_service.create(str(admin.id), "Kids", min_age=6, max_age=12)
    updated = organization_service.update(
        str(admin.id), str(org.id), name="Juniors", max_age=14
    )
    assert updated.name == "Juniors"
    assert updated.max_age == 14


def test_update_rejected_for_non_admin(organization_service, user_repo):
    admin = _admin(user_repo)
    user = _make_user(user_repo)
    org = organization_service.create(str(admin.id), "Kids", min_age=6, max_age=12)
    with pytest.raises(ForbiddenError):
        organization_service.update(str(user.id), str(org.id), name="Hacked")


def test_delete_organization(organization_service, user_repo):
    admin = _admin(user_repo)
    org = organization_service.create(str(admin.id), "Tmp")
    organization_service.delete(str(admin.id), str(org.id))
    assert organization_service.list_all() == []


def test_join_within_age_range(organization_service, user_repo):
    admin = _admin(user_repo)
    user = _make_user(user_repo, birth_date=date(2015, 1, 1))
    org = organization_service.create(str(admin.id), "Kids", min_age=6, max_age=14)

    joined = organization_service.join(str(user.id), str(org.id))

    assert joined.id == org.id
    assert organization_service.list_for_user(str(user.id)) == [org]


def test_join_too_young_rejected(organization_service, user_repo):
    admin = _admin(user_repo)
    user = _make_user(user_repo, birth_date=date(2020, 1, 1))
    org = organization_service.create(str(admin.id), "Teens", min_age=13, max_age=18)
    with pytest.raises(AgeNotAllowedError):
        organization_service.join(str(user.id), str(org.id))


def test_join_unknown_organization(organization_service, user_repo):
    user = _make_user(user_repo)
    with pytest.raises(OrganizationNotFoundError):
        organization_service.join(str(user.id), "00000000-0000-0000-0000-000000000000")


def test_join_twice_rejected(organization_service, user_repo):
    admin = _admin(user_repo)
    user = _make_user(user_repo, birth_date=date(2000, 1, 1))
    org = organization_service.create(str(admin.id), "Adults", min_age=18, max_age=99)
    organization_service.join(str(user.id), str(org.id))
    with pytest.raises(AlreadyMemberError):
        organization_service.join(str(user.id), str(org.id))


def test_leave_organization(organization_service, user_repo):
    admin = _admin(user_repo)
    user = _make_user(user_repo, birth_date=date(2000, 1, 1))
    org = organization_service.create(str(admin.id), "Adults", min_age=18, max_age=99)
    organization_service.join(str(user.id), str(org.id))

    organization_service.leave(str(user.id), str(org.id))

    assert organization_service.list_for_user(str(user.id)) == []


def test_leave_when_not_member(organization_service, user_repo):
    admin = _admin(user_repo)
    user = _make_user(user_repo)
    org = organization_service.create(str(admin.id), "Open")
    with pytest.raises(NotMemberError):
        organization_service.leave(str(user.id), str(org.id))


def test_join_open_organization_without_birth_date(organization_service, user_repo):
    admin = _admin(user_repo)
    user = _make_user(user_repo, birth_date=None)
    org = organization_service.create(str(admin.id), "Open")
    joined = organization_service.join(str(user.id), str(org.id))
    assert joined.id == org.id


def test_suggest_for_age(organization_service, user_repo):
    admin = _admin(user_repo)
    organization_service.create(str(admin.id), "Kids", min_age=6, max_age=12)
    organization_service.create(str(admin.id), "Teens", min_age=13, max_age=18)
    organization_service.create(str(admin.id), "Open")

    matched = organization_service.suggest_for_age(15)
    names = sorted(o.name for o in matched)
    assert names == ["Open", "Teens"]
