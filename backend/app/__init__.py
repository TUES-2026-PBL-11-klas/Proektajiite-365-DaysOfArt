import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import inspect
from app.extensions import db, jwt, revoked_tokens
from app.exceptions import AppError

load_dotenv()


def _ensure_dev_schema(app):
    """Rebuild stale local SQLite DBs after model shape changes.

    create_all() does not alter existing tables. A local DB created before the
    shared models landed can still have submissions.prompt_id/image_data instead
    of topic_id/image_url, which breaks feed/profile endpoints. This guard only
    runs for local SQLite, never for configured external DBs.
    """
    db.create_all()
    uri = app.config["SQLALCHEMY_DATABASE_URI"]
    if not uri.startswith("sqlite:"):
        return

    inspector = inspect(db.engine)
    if not inspector.has_table("submissions"):
        _remove_legacy_dev_seed_data()
        return

    columns = {column["name"] for column in inspector.get_columns("submissions")}
    if {"topic_id", "image_url", "date"}.issubset(columns):
        _remove_legacy_dev_seed_data()
        return

    db.drop_all()
    db.create_all()


def _remove_legacy_dev_seed_data():
    """Remove old auto-seeded local-only topics that caused laptop drift."""
    from app.models import Organization, Submission, Topic

    legacy_topic_titles = {
        "Град по залез",
        "Механична градина",
        "Портрет с два цвята",
    }
    legacy_org_names = {
        "Деца",
        "Тийн артисти",
        "Възрастни",
    }

    for topic in Topic.query.filter(Topic.title.in_(legacy_topic_titles)).all():
        has_submissions = (
            Submission.query.filter(Submission.topic_id == topic.id).first()
            is not None
        )
        if not has_submissions:
            db.session.delete(topic)

    for organization in Organization.query.filter(
        Organization.name.in_(legacy_org_names)
    ).all():
        has_submissions = (
            Submission.query.filter(Submission.organization_id == organization.id).first()
            is not None
        )
        if not has_submissions:
            db.session.delete(organization)

    db.session.commit()


def create_app(config=None):
    app = Flask(__name__)
    CORS(
        app,
        resources={r"/api/*": {
            "origins": "*",
            "allow_headers": ["Content-Type", "Authorization", "Accept"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "expose_headers": ["Content-Type"],
        }},
    )

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

    db.init_app(app)
    jwt.init_app(app)

    from app.models import (  # noqa: F401
        User, Organization, UserOrganization,
        Topic, Submission,
        Like, Comment, UserInteraction, RecommendationScore,
    )

    @jwt.token_in_blocklist_loader
    def _is_revoked(jwt_header, jwt_payload):
        return jwt_payload["jti"] in revoked_tokens

    @app.errorhandler(AppError)
    def _handle_app_error(err):
        return jsonify(err.to_dict()), err.status_code

    @app.errorhandler(ValueError)
    def _handle_value_error(err):
        return jsonify({"error": str(err)}), 400

    if not app.config.get("TESTING"):
        with app.app_context():
            _ensure_dev_schema(app)

    # Person 2's prompt/submission endpoints live in the `main` blueprint.
    from .routes import main
    from .routes.auth_routes import auth_bp
    from .routes.profile_routes import profile_bp
    from .routes.organization_routes import organization_bp

    app.register_blueprint(main)
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(organization_bp)

    from .cli import register_cli
    register_cli(app)

    return app
