"""Insert the 365 drawing themes into the configured topics table.

Usage:
    python3 -m scripts.seed_topics
"""
import json
from pathlib import Path

from app import create_app
from app.extensions import db
from app.models import Topic


DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "drawing_themes.json"


def load_topics():
    with DATA_FILE.open(encoding="utf-8") as themes_file:
        theme_groups = json.load(themes_file)

    return [
        {
            "title": title,
            "description": (
                f'Draw a creative interpretation of "{title}". '
                "Use composition, shape, texture, and mood to tell a visual story."
            ),
            "category": category,
        }
        for category, titles in theme_groups.items()
        for title in titles
    ]


def run():
    topics = load_topics()
    app = create_app()

    with app.app_context():
        existing_titles = {
            title for (title,) in db.session.query(Topic.title).all()
        }
        new_topics = [
            Topic(**topic, is_used=False)
            for topic in topics
            if topic["title"] not in existing_titles
        ]

        db.session.add_all(new_topics)
        db.session.commit()

        skipped = len(topics) - len(new_topics)
        print(f"Inserted {len(new_topics)} drawing themes; skipped {skipped} existing themes.")


if __name__ == "__main__":
    run()
