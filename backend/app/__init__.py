import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from app.extensions import db, jwt, revoked_tokens
from app.exceptions import AppError

load_dotenv()


def create_app(config=None):
    app = Flask(__name__)
    CORS(app)

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
            db.create_all()

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
