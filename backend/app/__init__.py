import os

from flask import Flask
from flask_cors import CORS

from .extensions import db


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

    from .routes import main
    app.register_blueprint(main)
    from .cli import register_cli

    register_cli(app)

    with app.app_context():
        from . import models  # noqa: F401

        db.create_all()

    return app
