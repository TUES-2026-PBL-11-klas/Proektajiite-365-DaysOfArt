from sqlalchemy import or_
from app.models import User, Submission, Topic
from app.utils import to_uuid


class UserRepository:
    """Data-access layer for users. Holds no business logic; the session is
    injected so the repository can be reused with a test session."""

    def __init__(self, session):
        self._session = session

    def get_by_id(self, user_id):
        return self._session.get(User, to_uuid(user_id))

    def get_by_email(self, email):
        return self._session.query(User).filter(User.email == email).first()

    def get_by_username(self, username):
        return self._session.query(User).filter(User.username == username).first()

    def exists_with_username_or_email(self, username, email):
        return (
            self._session.query(User)
            .filter(or_(User.username == username, User.email == email))
            .first()
            is not None
        )

    def add(self, user):
        self._session.add(user)
        self._session.flush()
        return user

    def commit(self):
        self._session.commit()

    def get_submissions_grouped_by_date(self, user_id):
        """Returns the user's submissions joined with their topic, ordered
        newest first. Used by the profile gallery / drawing-history endpoint."""
        return (
            self._session.query(Submission, Topic)
            .join(Topic, Submission.topic_id == Topic.id)
            .filter(Submission.user_id == to_uuid(user_id))
            .order_by(Submission.date.desc(), Submission.created_at.desc())
            .all()
        )
