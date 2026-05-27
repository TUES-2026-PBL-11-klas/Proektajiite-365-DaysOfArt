from flask import Blueprint, jsonify, request

from ..container import (
    make_prompt_scheduler,
    make_prompt_service,
    make_submission_service,
)

main = Blueprint("main", __name__)


def _optional_value(value):
    if value is None or value == "":
        return None
    return value


@main.route("/api/health")
def health():
    return jsonify({"status": "ok"})


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
