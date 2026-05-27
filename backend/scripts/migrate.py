"""Lightweight schema migration runner. Each migration is a single SQL
statement that uses IF NOT EXISTS / IF EXISTS where possible, so the script
is idempotent — running it twice is a no-op.

Usage:
    python3 -m scripts.migrate
"""
from sqlalchemy import text
from app import create_app
from app.extensions import db

MIGRATIONS = [
    # 001 — add role column to users for global admin/user distinction
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'",
]


def run():
    app = create_app()
    with app.app_context():
        for i, stmt in enumerate(MIGRATIONS, start=1):
            print(f"[{i}/{len(MIGRATIONS)}] {stmt}")
            db.session.execute(text(stmt))
        db.session.commit()
        print("Migrations complete.")


if __name__ == "__main__":
    run()
