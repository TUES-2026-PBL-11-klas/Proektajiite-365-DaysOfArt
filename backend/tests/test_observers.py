from datetime import date
from unittest.mock import MagicMock

import pytest

from app.observers.base import LikeObserver
from app.observers.interaction_tracker import InteractionTracker
from app.observers.leaderboard_updater import LeaderboardUpdater
from app.services.social_service import SocialService

def test_like_observer_cannot_be_instantiated():
    with pytest.raises(TypeError):
        LikeObserver()


def test_leaderboard_updater_on_like_added_does_not_raise():
    updater = LeaderboardUpdater(MagicMock())
    updater.on_like_added("u1", "s1")


def test_leaderboard_updater_on_like_removed_does_not_raise():
    updater = LeaderboardUpdater(MagicMock())
    updater.on_like_removed("u1", "s1")


def test_interaction_tracker_like_added_records_interaction():
    repo = MagicMock()
    tracker = InteractionTracker(repo)
    tracker.on_like_added("u1", "s1")
    repo.record_interaction.assert_called_once_with(
        user_id="u1", submission_id="s1", interaction_type="like", weight=1.0
    )


def test_interaction_tracker_like_removed_records_interaction():
    repo = MagicMock()
    tracker = InteractionTracker(repo)
    tracker.on_like_removed("u1", "s1")
    repo.record_interaction.assert_called_once_with(
        user_id="u1", submission_id="s1", interaction_type="unlike", weight=-1.0
    )


def test_interaction_tracker_repo_exception_does_not_propagate():
    repo = MagicMock()
    repo.record_interaction.side_effect = Exception("DB down")
    tracker = InteractionTracker(repo)
    tracker.on_like_added("u1", "s1")

def _make_submission():
    s = MagicMock()
    s.user_id = "owner"
    s.date = date.today()
    return s


def test_all_observers_notified_on_like_added():
    repo = MagicMock()
    repo.get_submission.return_value = _make_submission()

    obs1 = MagicMock(spec=LikeObserver)
    obs2 = MagicMock(spec=LikeObserver)

    SocialService(repo, observers=[obs1, obs2]).add_like(
        {"user_id": "other", "submission_id": "s1"}
    )

    obs1.on_like_added.assert_called_once_with("other", "s1")
    obs2.on_like_added.assert_called_once_with("other", "s1")


def test_all_observers_notified_on_like_removed():
    repo = MagicMock()
    repo.get_submission.return_value = _make_submission()

    obs1 = MagicMock(spec=LikeObserver)
    obs2 = MagicMock(spec=LikeObserver)

    SocialService(repo, observers=[obs1, obs2]).remove_like(
        {"user_id": "other", "submission_id": "s1"}
    )

    obs1.on_like_removed.assert_called_once_with("other", "s1")
    obs2.on_like_removed.assert_called_once_with("other", "s1")


def test_no_observers_does_not_raise():
    repo = MagicMock()
    repo.get_submission.return_value = _make_submission()

    SocialService(repo, observers=[]).add_like(
        {"user_id": "other", "submission_id": "s1"}
    )
