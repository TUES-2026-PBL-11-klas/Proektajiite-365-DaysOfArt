from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.container import build_services
from app.serializers import serialize_user

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@profile_bp.get("")
@jwt_required()
def get_my_profile():
    services = build_services()
    user = services["users"].get_profile(get_jwt_identity())
    return jsonify(serialize_user(user)), 200


@profile_bp.put("")
@jwt_required()
def update_my_profile():
    data = request.get_json(silent=True) or {}
    services = build_services()
    user = services["users"].update_profile(
        get_jwt_identity(),
        display_name=data.get("display_name"),
        bio=data.get("bio"),
        avatar_url=data.get("avatar_url"),
    )
    return jsonify(serialize_user(user)), 200


@profile_bp.get("/history")
@jwt_required()
def get_my_history():
    services = build_services()
    history = services["users"].get_drawing_history(get_jwt_identity())
    return jsonify({"history": history}), 200
