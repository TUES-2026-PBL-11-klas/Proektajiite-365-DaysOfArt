from datetime import date
from app.models import Organization, UserOrganization
from app.exceptions import (
    OrganizationNotFoundError,
    UserNotFoundError,
    AlreadyMemberError,
    NotMemberError,
    AgeNotAllowedError,
    ValidationError,
    ForbiddenError,
)
from app.services.validators import require


def _age_on(birth_date, today):
    return (
        today.year
        - birth_date.year
        - ((today.month, today.day) < (birth_date.month, birth_date.day))
    )


def _validate_age_range(min_age, max_age):
    if min_age is not None and max_age is not None and min_age > max_age:
        raise ValidationError("min_age cannot be greater than max_age")


class OrganizationService:
    """Organization management and membership. Depends on the organization
    and user repositories (both injected). Mutating operations (create/edit/
    delete) require the acting user to have role='admin'."""

    def __init__(self, organization_repository, user_repository):
        self._orgs = organization_repository
        self._users = user_repository

    def _require_admin(self, acting_user_id):
        if acting_user_id is None:
            raise ForbiddenError()
        user = self._users.get_by_id(acting_user_id)
        if user is None:
            raise UserNotFoundError()
        if user.role != "admin":
            raise ForbiddenError("Only administrators can manage organizations")
        return user

    def create(self, acting_user_id, name, min_age=None, max_age=None, description=None):
        self._require_admin(acting_user_id)
        require(name, "name")
        _validate_age_range(min_age, max_age)

        org = Organization(
            name=name.strip(),
            min_age=min_age,
            max_age=max_age,
            description=description,
        )
        self._orgs.add(org)
        self._orgs.commit()
        return org

    def update(self, acting_user_id, organization_id, **fields):
        self._require_admin(acting_user_id)
        org = self._orgs.get_by_id(organization_id)
        if org is None:
            raise OrganizationNotFoundError()

        if "name" in fields and fields["name"] is not None:
            require(fields["name"], "name")
            org.name = fields["name"].strip()
        if "min_age" in fields:
            org.min_age = fields["min_age"]
        if "max_age" in fields:
            org.max_age = fields["max_age"]
        if "description" in fields:
            org.description = fields["description"]

        _validate_age_range(org.min_age, org.max_age)
        self._orgs.commit()
        return org

    def delete(self, acting_user_id, organization_id):
        self._require_admin(acting_user_id)
        org = self._orgs.get_by_id(organization_id)
        if org is None:
            raise OrganizationNotFoundError()
        self._orgs.delete(org)
        self._orgs.commit()

    def list_all(self):
        return self._orgs.list_all()

    def list_for_user(self, user_id):
        return self._orgs.list_for_user(user_id)

    def suggest_for_age(self, age):
        """Returns organizations whose age range includes the given age (or
        which have no age limits). Used by the registration UI to highlight
        groups that match a user's birth date."""
        return [
            o for o in self._orgs.list_all()
            if (o.min_age is None or age >= o.min_age)
            and (o.max_age is None or age <= o.max_age)
        ]

    def join(self, user_id, organization_id):
        user = self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError()

        org = self._orgs.get_by_id(organization_id)
        if org is None:
            raise OrganizationNotFoundError()

        if self._orgs.get_membership(user_id, organization_id) is not None:
            raise AlreadyMemberError()

        self._check_age(user, org)

        membership = UserOrganization(user_id=user_id, organization_id=organization_id)
        self._orgs.add_membership(membership)
        self._orgs.commit()
        return org

    def leave(self, user_id, organization_id):
        membership = self._orgs.get_membership(user_id, organization_id)
        if membership is None:
            raise NotMemberError()
        self._orgs.remove_membership(membership)
        self._orgs.commit()

    def _check_age(self, user, org):
        if org.min_age is None and org.max_age is None:
            return
        if user.birth_date is None:
            raise AgeNotAllowedError(
                "User has no birth date set, so age cannot be verified"
            )
        age = _age_on(user.birth_date, date.today())
        if org.min_age is not None and age < org.min_age:
            raise AgeNotAllowedError()
        if org.max_age is not None and age > org.max_age:
            raise AgeNotAllowedError()
