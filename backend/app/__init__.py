import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from app.extensions import db

load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(app)

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

    return app
