import uuid


class FakeUserRepository:
    """In-memory stand-in for UserRepository. Keyed by str(id) so it behaves
    the same whether given a UUID object or the string identity from a JWT."""

    def __init__(self, store):
        self._store = store

    def _ensure_id(self, user):
        if user.id is None:
            user.id = uuid.uuid4()
        return user

    def get_by_id(self, user_id):
        return self._store.users.get(str(user_id))

    def get_by_email(self, email):
        return next(
            (u for u in self._store.users.values() if u.email == email), None
        )

    def get_by_username(self, username):
        return next(
            (u for u in self._store.users.values() if u.username == username), None
        )

    def exists_with_username_or_email(self, username, email):
        return any(
            u.username == username or u.email == email
            for u in self._store.users.values()
        )

    def add(self, user):
        self._ensure_id(user)
        self._store.users[str(user.id)] = user
        return user

    def commit(self):
        pass

    def get_submissions_grouped_by_date(self, user_id):
        return self._store.submissions.get(str(user_id), [])


class FakeOrganizationRepository:
    def __init__(self, store):
        self._store = store

    def _ensure_id(self, org):
        if org.id is None:
            org.id = uuid.uuid4()
        return org

    def get_by_id(self, organization_id):
        return self._store.orgs.get(str(organization_id))

    def list_all(self):
        return sorted(self._store.orgs.values(), key=lambda o: o.name)

    def add(self, org):
        self._ensure_id(org)
        self._store.orgs[str(org.id)] = org
        return org

    def delete(self, org):
        self._store.orgs.pop(str(org.id), None)
        self._store.memberships = {
            k: v for k, v in self._store.memberships.items() if k[1] != str(org.id)
        }

    def get_membership(self, user_id, organization_id):
        return self._store.memberships.get((str(user_id), str(organization_id)))

    def list_for_user(self, user_id):
        org_ids = [
            oid for (uid, oid) in self._store.memberships if uid == str(user_id)
        ]
        return [self._store.orgs[oid] for oid in org_ids if oid in self._store.orgs]

    def add_membership(self, membership):
        key = (str(membership.user_id), str(membership.organization_id))
        self._store.memberships[key] = membership
        return membership

    def remove_membership(self, membership):
        key = (str(membership.user_id), str(membership.organization_id))
        self._store.memberships.pop(key, None)

    def commit(self):
        pass


class Store:
    """Shared backing data for the fake repositories within a single test."""

    def __init__(self):
        self.users = {}
        self.orgs = {}
        self.memberships = {}
        self.submissions = {}
