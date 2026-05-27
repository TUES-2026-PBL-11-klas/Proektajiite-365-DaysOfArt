from datetime import date as date_type, timedelta

from flask import Blueprint, jsonify, request

from ..container import (
    make_prompt_scheduler,
    make_prompt_service,
    make_recommendation_service,
    make_submission_repository,
    make_submission_service,
)
from ..exceptions import AppError, NotFoundError

main = Blueprint("main", __name__)


# ------------------------------------------------------------------ helpers

def _optional(value):
    return None if (value is None or value == "") else value


def _parse_page_params(args):
    page = max(1, int(args.get("page", 1)))
    per_page = min(max(1, int(args.get("per_page", 20))), 100)
    return page, per_page


def _paginated(items, total, page, per_page):
    return {
        "submissions": [s.to_dict() for s in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
    }


def _parse_date(args, key="date"):
    raw = _optional(args.get(key))
    return date_type.fromisoformat(raw) if raw else None


# --------------------------------------------------------------- error handlers

@main.errorhandler(AppError)
def handle_app_error(error):
    return jsonify({"error": error.message}), error.status_code


@main.errorhandler(ValueError)
def handle_value_error(error):
    return jsonify({"error": str(error)}), 400


# ------------------------------------------------------------------ system

@main.route("/api/health")
def health():
    return jsonify({"status": "ok"})


# ------------------------------------------------------------------ prompts

@main.route("/api/prompts", methods=["POST"])
def create_prompt():
    prompt = make_prompt_service().create_prompt(request.get_json(silent=True) or {})
    return jsonify({"prompt": prompt.to_dict()}), 201


@main.route("/api/prompts/daily", methods=["GET"])
def get_daily_prompt():
    organization_id = _optional(request.args.get("organization_id"))
    daily_prompt = make_prompt_service().get_or_create_daily_prompt(organization_id)
    return jsonify({"daily_prompt": daily_prompt.to_dict()})


# ---------------------------------------------------------------- submissions

@main.route("/api/submissions", methods=["POST"])
def submit_drawing():
    submission = make_submission_service().submit_drawing(request.get_json(silent=True) or {})
    return jsonify({"submission": submission.to_dict()}), 201


@main.route("/api/submissions/<submission_id>", methods=["GET"])
def get_submission(submission_id):
    try:
        submission = make_submission_repository().get_by_id(submission_id)
    except ValueError:
        raise NotFoundError("Submission not found")
    if not submission:
        raise NotFoundError("Submission not found")
    return jsonify({"submission": submission.to_dict()})


@main.route("/api/submissions/<submission_id>/similar", methods=["GET"])
def get_similar_drawings(submission_id):
    limit = min(max(1, int(request.args.get("limit", 10))), 50)
    try:
        submissions = make_recommendation_service().get_similar_drawings(submission_id, limit)
    except ValueError:
        raise NotFoundError("Submission not found")
    return jsonify({"similar_drawings": [s.to_dict() for s in submissions]})


# --------------------------------------------------------------- user endpoints

@main.route("/api/users/<user_id>/submissions", methods=["GET"])
def get_user_submissions(user_id):
    page, per_page = _parse_page_params(request.args)
    filter_date = _parse_date(request.args)
    try:
        items, total = make_submission_repository().get_user_submissions(
            user_id, filter_date, page, per_page
        )
    except ValueError:
        raise NotFoundError("User not found")
    return jsonify(_paginated(items, total, page, per_page))


@main.route("/api/users/<user_id>/recommended-artists", methods=["GET"])
def get_recommended_artists(user_id):
    limit = min(max(1, int(request.args.get("limit", 10))), 50)
    try:
        artist_ids = make_recommendation_service().get_recommended_artist_ids(user_id, limit)
    except ValueError:
        raise NotFoundError("User not found")
    return jsonify({"recommended_artist_ids": artist_ids})


# ------------------------------------------------- Tab 1 — daily feed

@main.route("/api/feed", methods=["GET"])
def get_feed():
    organization_id = _optional(request.args.get("organization_id"))
    page, per_page = _parse_page_params(request.args)
    feed_date = _parse_date(request.args)
    items, total = make_submission_repository().get_feed(organization_id, feed_date, page, per_page)
    return jsonify(_paginated(items, total, page, per_page))


@main.route("/api/feed/personalized", methods=["GET"])
def get_daily_personalized_feed():
    user_id = _optional(request.args.get("user_id"))
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    organization_id = _optional(request.args.get("organization_id"))
    page, per_page = _parse_page_params(request.args)
    feed_date = _parse_date(request.args)
    items, total = make_submission_repository().get_daily_personalized_feed(
        user_id, organization_id, feed_date, page, per_page
    )
    return jsonify(_paginated(items, total, page, per_page))


# -------------------------------------------- Tab 2 — all-time gallery

@main.route("/api/feed/all", methods=["GET"])
def get_all_feed():
    organization_id = _optional(request.args.get("organization_id"))
    page, per_page = _parse_page_params(request.args)
    items, total = make_submission_repository().get_all_submissions(organization_id, page, per_page)
    return jsonify(_paginated(items, total, page, per_page))


@main.route("/api/feed/all/personalized", methods=["GET"])
def get_all_personalized_feed():
    user_id = _optional(request.args.get("user_id"))
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    organization_id = _optional(request.args.get("organization_id"))
    page, per_page = _parse_page_params(request.args)
    items, total = make_submission_repository().get_all_time_personalized(
        user_id, organization_id, page, per_page
    )
    return jsonify(_paginated(items, total, page, per_page))


# -------------------------------------------- end-of-day archive endpoint

@main.route("/api/archive/daily", methods=["POST"])
def archive_daily():
    data = request.get_json(silent=True) or {}
    date_str = _optional(data.get("date"))
    target_date = (
        date_type.fromisoformat(date_str) if date_str
        else date_type.today() - timedelta(days=1)
    )
    count = make_submission_repository().count_submissions_for_date(target_date)
    return jsonify({
        "archived_date": target_date.isoformat(),
        "submissions_archived": count,
    })


# ----------------------------------------------------------------- cron

@main.route("/api/cron/daily", methods=["POST"])
def run_daily_cron():
    results = make_prompt_scheduler().run_daily_jobs()
    return jsonify({
        "jobs": {
            name: len(result) if isinstance(result, list) else result
            for name, result in results.items()
        }
    })
