from datetime import date as date_type, timedelta

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
    """A user's full drawing history.

    Pass ?date=YYYY-MM-DD to see what they drew on a specific day.
    A user who belongs to multiple organisations may have several submissions
    on the same date (one per organisation), all returned here.
    """
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
#
# Shows only submissions made on today's date (or an explicit ?date=).
# The feed is naturally empty at the start of each new day because no one has
# submitted yet.  Supply ?organization_id= to scope to a single organisation;
# omit it for the platform-wide ("general") view that aggregates every org.
#
# A user in multiple organisations can have one submission per org per day, so
# the platform-wide daily feed may contain several entries from the same person.

@main.route("/api/feed", methods=["GET"])
def get_feed():
    organization_id = _optional(request.args.get("organization_id"))
    page, per_page = _parse_page_params(request.args)
    feed_date = _parse_date(request.args)

    items, total = make_submission_repository().get_feed(organization_id, feed_date, page, per_page)
    return jsonify(_paginated(items, total, page, per_page))


@main.route("/api/feed/personalized", methods=["GET"])
def get_daily_personalized_feed():
    """Daily feed ordered by the recommendation score for this user (Tab 1, logged-in view)."""
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
#
# Shows submissions from every day *before* today.  At midnight the calendar
# date advances and the current day's work moves into this pool automatically –
# no explicit migration or flag flip is required.  The two tabs therefore have
# zero overlap: Tab 1 is always fresh, Tab 2 is always the archive.
#
# The recommendation engine is active only here, not in the daily tab.
# Scope to a single organisation with ?organization_id=; omit it for the full
# platform gallery.

@main.route("/api/feed/all", methods=["GET"])
def get_all_feed():
    organization_id = _optional(request.args.get("organization_id"))
    page, per_page = _parse_page_params(request.args)

    items, total = make_submission_repository().get_all_submissions(
        organization_id, page, per_page
    )
    return jsonify(_paginated(items, total, page, per_page))


@main.route("/api/feed/all/personalized", methods=["GET"])
def get_all_personalized_feed():
    """All-time gallery ordered by the recommendation engine for this user (Tab 2, logged-in)."""
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
#
# At midnight the daily feed empties automatically (date.today() advances).
# This endpoint can be called by the daily cron job to get a confirmation
# and count of how many submissions transitioned into the gallery pool.
# Pass {"date": "YYYY-MM-DD"} to check a specific date; omits defaults to yesterday.

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
    return jsonify(
        {
            "jobs": {
                name: len(result) if isinstance(result, list) else result
                for name, result in results.items()
            }
        }
    )
