from app.models import User
from app.exceptions import (
    UserAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
)
from app.services.validators import (
    validate_username,
    validate_email_address,
    validate_password,
    validate_birth_date,
)


class AuthService:
    """Authentication business logic. Dependencies (the user repository and
    the password hasher) are injected so the service is decoupled from both
    SQLAlchemy and bcrypt and can be unit-tested with fakes."""

    def __init__(self, user_repository, password_hasher):
        self._users = user_repository
        self._hasher = password_hasher

    def register(self, username, email, password, display_name=None, birth_date=None):
        username = validate_username(username)
        email = validate_email_address(email)
        validate_password(password)
        birth_date = validate_birth_date(birth_date)

        if self._users.exists_with_username_or_email(username, email):
            raise UserAlreadyExistsError()

        user = User(
            username=username,
            email=email,
            password_hash=self._hasher.hash(password),
            display_name=display_name or username,
            birth_date=birth_date,
            role="user",
        )
        self._users.add(user)
        self._users.commit()
        return user

    def authenticate(self, email, password):
        user = self._users.get_by_email(email)
        if user is None or not self._hasher.verify(password, user.password_hash):
            raise InvalidCredentialsError()
        return user

    def change_password(self, user_id, current_password, new_password):
        user = self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError()
        if not self._hasher.verify(current_password, user.password_hash):
            raise InvalidCredentialsError("Current password is incorrect")

        validate_password(new_password)
        user.password_hash = self._hasher.hash(new_password)
        self._users.commit()
        return user
