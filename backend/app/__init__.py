import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from app.extensions import db

from .extensions import db


def create_app(config=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///365_days_of_art.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(
        hours=int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    )
    if config:
        app.config.update(config)

    if config:
        app.config.update(config)

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    from .routes import main
    app.register_blueprint(main)
    from .cli import register_cli

    register_cli(app)

    with app.app_context():
        db.create_all()

    from .routes import main
    app.register_blueprint(main)

    return app
