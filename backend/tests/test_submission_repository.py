"""Unit tests for SubmissionRepository (Person 3).

Naming convention:
  * _seed()       → two submissions, both dated today  (daily feed)
  * _seed_past()  → two submissions, both dated yesterday  (gallery / all-time)
"""

import uuid
from datetime import date, timedelta

import pytest

from app import create_app
from app.extensions import db
from app.models import Organization, RecommendationScore, Submission, Topic, User, UserInteraction
from app.repositories.submission_repository import SubmissionRepository

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)


@pytest.fixture()
def app():
    application = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


def _base_records(session):
    """Create two users and one org+topic without any submissions."""
    user1 = User(username="u1", email="u1@test.com", password_hash="h")
    user2 = User(username="u2", email="u2@test.com", password_hash="h")
    org = Organization(name="Org")
    topic = Topic(title="T", description="D", is_used=True, used_on=TODAY)
    session.add_all([user1, user2, org, topic])
    session.commit()
    return user1, user2, org, topic


def _seed(session):
    """Two submissions dated TODAY (daily-feed data)."""
    user1, user2, org, topic = _base_records(session)
    sub1 = Submission(user_id=user1.id, organization_id=org.id, topic_id=topic.id,
                      date=TODAY, image_url="http://img/1")
    sub2 = Submission(user_id=user2.id, organization_id=org.id, topic_id=topic.id,
                      date=TODAY, image_url="http://img/2")
    session.add_all([sub1, sub2])
    session.commit()
    return user1, user2, org, topic, sub1, sub2


def _seed_past(session):
    """Two submissions dated YESTERDAY (gallery / all-time data)."""
    user1, user2, org, topic = _base_records(session)
    sub1 = Submission(user_id=user1.id, organization_id=org.id, topic_id=topic.id,
                      date=YESTERDAY, image_url="http://img/1")
    sub2 = Submission(user_id=user2.id, organization_id=org.id, topic_id=topic.id,
                      date=YESTERDAY, image_url="http://img/2")
    session.add_all([sub1, sub2])
    session.commit()
    return user1, user2, org, topic, sub1, sub2


# ============================================================== get_feed (Tab 1)

def test_get_feed_returns_todays_submissions(app):
    with app.app_context():
        _, _, _, _, sub1, sub2 = _seed(db.session)
        items, total = SubmissionRepository().get_feed()
        assert total == 2
        ids = {s.id for s in items}
        assert sub1.id in ids and sub2.id in ids


def test_get_feed_excludes_other_dates(app):
    with app.app_context():
        user1, _, org, topic, _, _ = _seed(db.session)
        db.session.add(Submission(user_id=user1.id, organization_id=org.id, topic_id=topic.id,
                                  date=YESTERDAY, image_url="http://img/old"))
        db.session.commit()
        _, total = SubmissionRepository().get_feed()
        assert total == 2  # only today's two; yesterday excluded


def test_get_feed_filters_by_organization(app):
    with app.app_context():
        user1, _, org, topic, _, _ = _seed(db.session)
        other_org = Organization(name="OtherOrg")
        db.session.add(other_org)
        db.session.commit()
        db.session.add(Submission(user_id=user1.id, organization_id=other_org.id,
                                  topic_id=topic.id, date=TODAY, image_url="http://img/3"))
        db.session.commit()
        items, total = SubmissionRepository().get_feed(organization_id=org.id)
        assert total == 2
        assert all(str(s.organization_id) == str(org.id) for s in items)


def test_get_feed_paginates(app):
    with app.app_context():
        user1, _, org, topic, _, _ = _seed(db.session)
        for i in range(3, 8):
            db.session.add(Submission(user_id=user1.id, organization_id=org.id,
                                      topic_id=topic.id, date=TODAY, image_url=f"http/img/{i}"))
        db.session.commit()
        items_p1, total = SubmissionRepository().get_feed(page=1, per_page=3)
        assert total == 7
        assert len(items_p1) == 3
        items_p2, _ = SubmissionRepository().get_feed(page=2, per_page=3)
        assert not {s.id for s in items_p1} & {s.id for s in items_p2}


# ========================================== get_all_submissions (Tab 2 – gallery)

def test_get_all_submissions_includes_past_days(app):
    with app.app_context():
        _, _, _, _, sub1, sub2 = _seed_past(db.session)
        items, total = SubmissionRepository().get_all_submissions()
        assert total == 2
        ids = {s.id for s in items}
        assert sub1.id in ids and sub2.id in ids


def test_get_all_submissions_excludes_today(app):
    """Today's submissions must NOT appear in the gallery – they live in Tab 1."""
    with app.app_context():
        _seed(db.session)  # all dated TODAY
        _, total = SubmissionRepository().get_all_submissions()
        assert total == 0


def test_get_all_submissions_filters_by_organization(app):
    with app.app_context():
        user1, _, org, topic, _, _ = _seed_past(db.session)
        other_org = Organization(name="Other")
        db.session.add(other_org)
        db.session.commit()
        db.session.add(Submission(user_id=user1.id, organization_id=other_org.id,
                                  topic_id=topic.id, date=YESTERDAY, image_url="http/img/x"))
        db.session.commit()
        items, total = SubmissionRepository().get_all_submissions(organization_id=org.id)
        assert total == 2
        assert all(str(s.organization_id) == str(org.id) for s in items)


def test_get_all_submissions_paginates(app):
    with app.app_context():
        user1, _, org, topic, _, _ = _seed_past(db.session)
        for i in range(5):
            db.session.add(Submission(user_id=user1.id, organization_id=org.id,
                                      topic_id=topic.id, date=YESTERDAY, image_url=f"http/img/e{i}"))
        db.session.commit()
        items_p1, total = SubmissionRepository().get_all_submissions(page=1, per_page=3)
        assert total == 7
        assert len(items_p1) == 3
        items_p2, _ = SubmissionRepository().get_all_submissions(page=2, per_page=3)
        assert not {s.id for s in items_p1} & {s.id for s in items_p2}


# ==================================== get_all_time_personalized (Tab 2 + CF engine)

def test_get_all_time_personalized_orders_by_score(app):
    with app.app_context():
        user1, user2, org, topic, sub_low, sub_high = _seed_past(db.session)
        db.session.add(RecommendationScore(user_id=user1.id, submission_id=sub_low.id, score=0.1))
        db.session.add(RecommendationScore(user_id=user1.id, submission_id=sub_high.id, score=0.9))
        db.session.commit()
        items, total = SubmissionRepository().get_all_time_personalized(user1.id)
        assert total == 2
        assert items[0].id == sub_high.id


def test_get_all_time_personalized_excludes_today(app):
    """Recommendation feed must not include today's submissions."""
    with app.app_context():
        _, _, _, _, sub1, _ = _seed(db.session)
        _, total = SubmissionRepository().get_all_time_personalized(sub1.user_id)
        assert total == 0


def test_get_all_time_personalized_falls_back_to_recency(app):
    with app.app_context():
        _, _, _, _, sub1, _ = _seed_past(db.session)
        items, total = SubmissionRepository().get_all_time_personalized(sub1.user_id)
        assert total == 2  # both past-dated submissions visible


def test_get_all_time_personalized_filters_by_organization(app):
    with app.app_context():
        user1, _, org, topic, _, _ = _seed_past(db.session)
        other_org = Organization(name="Other")
        db.session.add(other_org)
        db.session.commit()
        db.session.add(Submission(user_id=user1.id, organization_id=other_org.id,
                                  topic_id=topic.id, date=YESTERDAY, image_url="http/img/x"))
        db.session.commit()
        _, total = SubmissionRepository().get_all_time_personalized(user1.id, organization_id=org.id)
        assert total == 2


# ===================================================== get_user_submissions (history)

def test_get_user_submissions_returns_all_dates(app):
    with app.app_context():
        user1, _, org, topic, sub_today, _ = _seed(db.session)
        db.session.add(Submission(user_id=user1.id, organization_id=org.id,
                                  topic_id=topic.id, date=YESTERDAY, image_url="http/img/old"))
        db.session.commit()
        items, total = SubmissionRepository().get_user_submissions(user1.id)
        assert total == 2
        dates = {s.date for s in items}
        assert TODAY in dates and YESTERDAY in dates


def test_get_user_submissions_filters_by_date(app):
    with app.app_context():
        user1, _, org, topic, sub_today, _ = _seed(db.session)
        db.session.add(Submission(user_id=user1.id, organization_id=org.id,
                                  topic_id=topic.id, date=YESTERDAY, image_url="http/img/old"))
        db.session.commit()
        items, total = SubmissionRepository().get_user_submissions(user1.id, filter_date=YESTERDAY)
        assert total == 1
        assert items[0].date == YESTERDAY


def test_get_user_submissions_returns_only_that_user(app):
    with app.app_context():
        user1, _, _, _, sub1, _ = _seed(db.session)
        items, total = SubmissionRepository().get_user_submissions(user1.id)
        assert total == 1
        assert items[0].id == sub1.id


def test_get_user_submissions_paginates(app):
    with app.app_context():
        user1, _, org, topic, _, _ = _seed(db.session)
        for i in range(4):
            db.session.add(Submission(user_id=user1.id, organization_id=org.id,
                                      topic_id=topic.id, date=TODAY, image_url=f"http/img/e{i}"))
        db.session.commit()
        items_p1, total = SubmissionRepository().get_user_submissions(user1.id, page=1, per_page=2)
        assert total == 5
        assert len(items_p1) == 2


# ============================================================== archive helpers

def test_count_submissions_for_date(app):
    with app.app_context():
        user1, user2, org, topic = _base_records(db.session)
        db.session.add(Submission(user_id=user1.id, organization_id=org.id,
                                  topic_id=topic.id, date=TODAY, image_url="http/1"))
        db.session.add(Submission(user_id=user2.id, organization_id=org.id,
                                  topic_id=topic.id, date=TODAY, image_url="http/2"))
        db.session.add(Submission(user_id=user1.id, organization_id=org.id,
                                  topic_id=topic.id, date=YESTERDAY, image_url="http/old"))
        db.session.commit()

        repo = SubmissionRepository()
        assert repo.count_submissions_for_date(TODAY) == 2
        assert repo.count_submissions_for_date(YESTERDAY) == 1


# ================================================================ lookup helpers

def test_get_by_id_returns_correct_submission(app):
    with app.app_context():
        _, _, _, _, sub1, _ = _seed(db.session)
        result = SubmissionRepository().get_by_id(sub1.id)
        assert result is not None and result.id == sub1.id


def test_get_by_id_returns_none_for_unknown_id(app):
    with app.app_context():
        _seed(db.session)
        assert SubmissionRepository().get_by_id(uuid.uuid4()) is None


def test_get_submissions_by_ids_returns_matching(app):
    with app.app_context():
        _, _, _, _, sub1, _ = _seed(db.session)
        results = SubmissionRepository().get_submissions_by_ids([sub1.id])
        assert len(results) == 1 and results[0].id == sub1.id


def test_get_submissions_by_ids_empty_list(app):
    with app.app_context():
        _seed(db.session)
        assert SubmissionRepository().get_submissions_by_ids([]) == []


# ============================================= interaction matrix (CF support)

def test_get_interaction_matrix_returns_scores(app):
    with app.app_context():
        user1, _, _, _, sub1, _ = _seed(db.session)
        db.session.add(UserInteraction(user_id=user1.id, submission_id=sub1.id,
                                       like_score=1.0, total_score=1.0))
        db.session.commit()
        matrix = SubmissionRepository().get_interaction_matrix()
        assert len(matrix) == 1
        assert str(matrix[0].user_id) == str(user1.id)
        assert float(matrix[0].score) == 1.0


def test_get_users_who_interacted_with_returns_interactors(app):
    with app.app_context():
        user1, user2, _, _, sub1, _ = _seed(db.session)
        db.session.add(UserInteraction(user_id=user1.id, submission_id=sub1.id, total_score=2.0))
        db.session.add(UserInteraction(user_id=user2.id, submission_id=sub1.id, total_score=1.0))
        db.session.commit()
        interactors = SubmissionRepository().get_users_who_interacted_with(sub1.id)
        assert len(interactors) == 2
        uids = {str(r.user_id) for r in interactors}
        assert str(user1.id) in uids and str(user2.id) in uids
