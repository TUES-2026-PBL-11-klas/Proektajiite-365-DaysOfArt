from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.container import build_services
from app.serializers import serialize_organization

organization_bp = Blueprint("organizations", __name__, url_prefix="/api/organizations")


@organization_bp.get("")
def list_organizations():
    services = build_services()
    orgs = services["organizations"].list_all()
    return jsonify({"organizations": [serialize_organization(o) for o in orgs]}), 200


@organization_bp.get("/suggest")
def suggest_organizations():
    """Suggest organizations matching a given age. Used by the registration
    form to recommend an age group based on the user's birth date."""
    age = request.args.get("age", type=int)
    if age is None:
        return jsonify({"organizations": []}), 200
    services = build_services()
    orgs = services["organizations"].suggest_for_age(age)
    return jsonify({"organizations": [serialize_organization(o) for o in orgs]}), 200


@organization_bp.post("")
@jwt_required()
def create_organization():
    data = request.get_json(silent=True) or {}
    services = build_services()
    org = services["organizations"].create(
        acting_user_id=get_jwt_identity(),
        name=data.get("name"),
        min_age=data.get("min_age"),
        max_age=data.get("max_age"),
        description=data.get("description"),
    )
    return jsonify(serialize_organization(org)), 201


@organization_bp.put("/<organization_id>")
@jwt_required()
def update_organization(organization_id):
    data = request.get_json(silent=True) or {}
    services = build_services()
    org = services["organizations"].update(
        acting_user_id=get_jwt_identity(),
        organization_id=organization_id,
        name=data.get("name"),
        min_age=data.get("min_age"),
        max_age=data.get("max_age"),
        description=data.get("description"),
    )
    return jsonify(serialize_organization(org)), 200


@organization_bp.delete("/<organization_id>")
@jwt_required()
def delete_organization(organization_id):
    services = build_services()
    services["organizations"].delete(get_jwt_identity(), organization_id)
    return jsonify({"message": "Organization deleted"}), 200


@organization_bp.get("/mine")
@jwt_required()
def my_organizations():
    services = build_services()
    orgs = services["organizations"].list_for_user(get_jwt_identity())
    return jsonify({"organizations": [serialize_organization(o) for o in orgs]}), 200


@organization_bp.post("/<organization_id>/join")
@jwt_required()
def join_organization(organization_id):
    services = build_services()
    org = services["organizations"].join(get_jwt_identity(), organization_id)
    return jsonify(
        {"message": "Joined organization", "organization": serialize_organization(org)}
    ), 200


@organization_bp.delete("/<organization_id>/leave")
@jwt_required()
def leave_organization(organization_id):
    services = build_services()
    services["organizations"].leave(get_jwt_identity(), organization_id)
    return jsonify({"message": "Left organization"}), 200
