import bcrypt


class PasswordHasher:
    """Encapsulates password hashing so the rest of the app never touches
    bcrypt directly. Swapping the algorithm later means changing only this
    class."""

    def __init__(self, rounds: int = 12):
        self._rounds = rounds

    def hash(self, plain_password: str) -> str:
        salt = bcrypt.gensalt(rounds=self._rounds)
        digest = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
        return digest.decode("utf-8")

    def verify(self, plain_password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                password_hash.encode("utf-8"),
            )
        except (ValueError, TypeError):
            return False
