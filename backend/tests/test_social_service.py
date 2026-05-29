from datetime import date
from unittest.mock import MagicMock

import pytest

from app.exceptions import NotFoundError, ValidationError
from app.services.social_service import SocialService


def _make_submission(owner_id="owner", sub_date=None):
    s = MagicMock()
    s.user_id = owner_id
    s.date = sub_date or date.today()
    return s


def _make_service(submission=None):
    repo = MagicMock()
    repo.get_submission.return_value = submission
    return SocialService(repo), repo


def test_add_like_missing_fields_raises():
    svc, _ = _make_service()
    with pytest.raises(ValidationError):
        svc.add_like({})


def test_add_like_submission_not_found_raises():
    svc, repo = _make_service(submission=None)
    with pytest.raises(NotFoundError):
        svc.add_like({"user_id": "u1", "submission_id": "s1"})


def test_add_like_own_submission_raises():
    sub = _make_submission(owner_id="u1")
    svc, _ = _make_service(submission=sub)
    with pytest.raises(ValidationError, match="own submission"):
        svc.add_like({"user_id": "u1", "submission_id": "s1"})


def test_add_like_old_submission_raises():
    sub = _make_submission(sub_date=date(2000, 1, 1))
    svc, _ = _make_service(submission=sub)
    with pytest.raises(ValidationError, match="today"):
        svc.add_like({"user_id": "u2", "submission_id": "s1"})


def test_add_like_valid_calls_repo():
    sub = _make_submission(owner_id="owner")
    svc, repo = _make_service(submission=sub)
    svc.add_like({"user_id": "other", "submission_id": "s1"})
    repo.add_like.assert_called_once_with("other", "s1")

def test_remove_like_missing_fields_raises():
    svc, _ = _make_service()
    with pytest.raises(ValidationError):
        svc.remove_like({})


def test_remove_like_valid_calls_repo():
    sub = _make_submission(owner_id="owner")
    svc, repo = _make_service(submission=sub)
    svc.remove_like({"user_id": "other", "submission_id": "s1"})
    repo.remove_like.assert_called_once_with("other", "s1")

def test_add_comment_empty_content_raises():
    sub = _make_submission(owner_id="owner")
    svc, _ = _make_service(submission=sub)
    with pytest.raises(ValidationError):
        svc.add_comment({"user_id": "other", "submission_id": "s1", "content": "  "})


def test_add_comment_valid_calls_repo():
    sub = _make_submission(owner_id="owner")
    svc, repo = _make_service(submission=sub)
    svc.add_comment({"user_id": "other", "submission_id": "s1", "content": "Nice!"})
    repo.add_comment.assert_called_once_with("other", "s1", "Nice!")


def test_get_leaderboard_missing_org_raises():
    svc, _ = _make_service()
    with pytest.raises(ValidationError):
        svc.get_leaderboard(None)


def test_get_leaderboard_calls_repo():
    svc, repo = _make_service()
    repo.get_top_submissions_today.return_value = []
    svc.get_leaderboard("org-1", limit=5)
    repo.get_top_submissions_today.assert_called_once_with("org-1", 5)