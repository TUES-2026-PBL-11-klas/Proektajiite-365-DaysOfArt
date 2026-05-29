from app.models import Organization, UserOrganization
from app.utils import to_uuid


class OrganizationRepository:
    """Data-access layer for organizations and the user<->organization
    membership join table."""

    def __init__(self, session):
        self._session = session

    def get_by_id(self, organization_id):
        return self._session.get(Organization, to_uuid(organization_id))

    def list_all(self):
        return self._session.query(Organization).order_by(Organization.name).all()

    def add(self, organization):
        self._session.add(organization)
        self._session.flush()
        return organization

    def delete(self, organization):
        self._session.delete(organization)

    def get_membership(self, user_id, organization_id):
        return self._session.get(
            UserOrganization,
            (to_uuid(user_id), to_uuid(organization_id)),
        )

    def list_for_user(self, user_id):
        return (
            self._session.query(Organization)
            .join(UserOrganization, UserOrganization.organization_id == Organization.id)
            .filter(UserOrganization.user_id == to_uuid(user_id))
            .order_by(Organization.name)
            .all()
        )

    def add_membership(self, membership):
        self._session.add(membership)
        self._session.flush()
        return membership

    def remove_membership(self, membership):
        self._session.delete(membership)

    def commit(self):
        self._session.commit()
