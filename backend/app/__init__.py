from flask import Flask
from flask_cors import CORS


def create_app(config=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///365_days_of_art.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    if config:
        app.config.update(config)

    CORS(app)
    db.init_app(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    from app.models import (  # noqa: F401
        User, Organization, UserOrganization,
        Topic, Submission,
        Like, Comment, UserInteraction, RecommendationScore,
    )

    with app.app_context():
        db.create_all()

    from .routes import main
    app.register_blueprint(main)
    from .cli import register_cli

    register_cli(app)

    with app.app_context():
        from . import models  # noqa: F401

        db.create_all()

    return app
