from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from app.container import build_services
from app.extensions import revoked_tokens
from app.exceptions import ValidationError
from app.serializers import serialize_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _parse_birth_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError("birth_date must be in YYYY-MM-DD format")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    services = build_services()
    user = services["auth"].register(
        username=data.get("username"),
        email=data.get("email"),
        password=data.get("password"),
        display_name=data.get("display_name"),
        birth_date=_parse_birth_date(data.get("birth_date")),
    )
    token = create_access_token(identity=str(user.id))
    return jsonify({"user": serialize_user(user), "access_token": token}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    services = build_services()
    user = services["auth"].authenticate(
        email=data.get("email"),
        password=data.get("password"),
    )
    token = create_access_token(identity=str(user.id))
    return jsonify({"user": serialize_user(user), "access_token": token}), 200


@auth_bp.post("/logout")
@jwt_required()
def logout():
    revoked_tokens.add(get_jwt()["jti"])
    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    data = request.get_json(silent=True) or {}
    services = build_services()
    services["auth"].change_password(
        user_id=get_jwt_identity(),
        current_password=data.get("current_password"),
        new_password=data.get("new_password"),
    )
    return jsonify({"message": "Password changed successfully"}), 200
