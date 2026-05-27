from collections import OrderedDict
from app.exceptions import UserNotFoundError


class UserService:
    """Profile reads/edits and drawing history. Depends only on the user
    repository (injected)."""

    EDITABLE_FIELDS = ("display_name", "bio", "avatar_url")

    def __init__(self, user_repository):
        self._users = user_repository

    def get_profile(self, user_id):
        user = self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError()
        return user

    def update_profile(self, user_id, **fields):
        user = self.get_profile(user_id)
        for field in self.EDITABLE_FIELDS:
            if field in fields and fields[field] is not None:
                setattr(user, field, fields[field])
        self._users.commit()
        return user

    def get_drawing_history(self, user_id):
        """Returns the user's submissions grouped by date (newest first),
        each entry pairing the submission with its topic."""
        if self._users.get_by_id(user_id) is None:
            raise UserNotFoundError()

        grouped = OrderedDict()
        for submission, topic in self._users.get_submissions_grouped_by_date(user_id):
            key = submission.date.isoformat()
            grouped.setdefault(key, []).append(
                {
                    "submission_id": str(submission.id),
                    "image_url": submission.image_url,
                    "topic_title": topic.title,
                    "topic_id": str(topic.id),
                    "created_at": submission.created_at.isoformat()
                    if submission.created_at
                    else None,
                }
            )
        return [{"date": date, "submissions": items} for date, items in grouped.items()]
