"""Bootstrap an admin user. Either promotes an existing user (by email) or
creates a new one with role='admin'.

Usage:
    python3 -m scripts.create_admin <username> <email> <password>
    python3 -m scripts.create_admin --promote <email>
"""
import sys
from app import create_app
from app.extensions import db
from app.models import User
from app.security import PasswordHasher


def promote(email: str):
    user = db.session.query(User).filter(User.email == email).first()
    if not user:
        print(f"No user with email {email!r}")
        sys.exit(1)
    user.role = "admin"
    db.session.commit()
    print(f"Promoted {user.username} ({user.email}) to admin.")


def create(username: str, email: str, password: str):
    if db.session.query(User).filter(
        (User.email == email) | (User.username == username)
    ).first():
        print("A user with that username or email already exists.")
        sys.exit(1)
    hasher = PasswordHasher()
    user = User(
        username=username,
        email=email,
        password_hash=hasher.hash(password),
        display_name=username,
        role="admin",
    )
    db.session.add(user)
    db.session.commit()
    print(f"Created admin {user.username} ({user.email}).")


def main():
    args = sys.argv[1:]
    app = create_app()
    with app.app_context():
        if len(args) == 2 and args[0] == "--promote":
            promote(args[1])
        elif len(args) == 3:
            create(*args)
        else:
            print(__doc__)
            sys.exit(1)


if __name__ == "__main__":
    main()
