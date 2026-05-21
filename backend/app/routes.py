from flask import Blueprint, jsonify, request

from .container import make_prompt_scheduler, make_prompt_service, make_submission_service
from .exceptions import AppError

main = Blueprint("main", __name__)


def _optional_value(value):
    if value is None or value == "":
        return None
    return value


@main.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@main.errorhandler(AppError)
def handle_app_error(error):
    return jsonify({"error": error.message}), error.status_code


@main.errorhandler(ValueError)
def handle_value_error(error):
    return jsonify({"error": str(error)}), 400


@main.route("/api/prompts", methods=["POST"])
def create_prompt():
    prompt = make_prompt_service().create_prompt(request.get_json(silent=True) or {})
    return jsonify({"prompt": prompt.to_dict()}), 201


@main.route("/api/prompts/daily", methods=["GET"])
def get_daily_prompt():
    organization_id = _optional_value(request.args.get("organization_id"))
    daily_prompt = make_prompt_service().get_or_create_daily_prompt(organization_id)
    return jsonify({"daily_prompt": daily_prompt.to_dict()})


@main.route("/api/submissions", methods=["POST"])
def submit_drawing():
    submission = make_submission_service().submit_drawing(request.get_json(silent=True) or {})
    return jsonify({"submission": submission.to_dict()}), 201


@main.route("/api/cron/daily", methods=["POST"])
def run_daily_cron():
    results = make_prompt_scheduler().run_daily_jobs()
    return jsonify(
        {
            "jobs": {
                name: len(result) if isinstance(result, list) else result
                for name, result in results.items()
            }
        }
    )
from .container import make_social_service


@main.route("/api/likes", methods=["POST"])
def add_like():
    make_social_service().add_like(request.get_json(silent=True) or {})
    return jsonify({"status": "liked"}), 201


@main.route("/api/likes", methods=["DELETE"])
def remove_like():
    make_social_service().remove_like(request.get_json(silent=True) or {})
    return jsonify({"status": "unliked"}), 200


@main.route("/api/comments", methods=["POST"])
def add_comment():
    comment = make_social_service().add_comment(request.get_json(silent=True) or {})
    return jsonify({"comment": comment.to_dict()}), 201


@main.route("/api/submissions/<submission_id>/comments", methods=["GET"])
def get_comments(submission_id):
    comments = make_social_service().get_comments(submission_id)
    return jsonify({"comments": [c.to_dict() for c in comments]})


@main.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    organization_id = _optional_value(request.args.get("organization_id"))
    limit = min(int(request.args.get("limit", 10)), 50)
    entries = make_social_service().get_leaderboard(organization_id, limit)
    return jsonify({"leaderboard": entries})