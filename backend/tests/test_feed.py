"""Integration tests for Person 3's feed and recommendation endpoints.

Key invariant tested throughout:
  Tab 1 (daily feed)  → date == today()   – empty at start of each new day
  Tab 2 (gallery)     → date  < today()   – the recommendation engine is here
  The two tabs have zero overlap on any given calendar day.

Helpers:
  _seed_today()  → submissions dated today   (daily-feed fixtures)
  _seed_past()   → submissions dated yesterday  (gallery fixtures)
"""

import uuid
from datetime import date, timedelta

from app.extensions import db
from app.models import Organization, RecommendationScore, Submission, Topic, User

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)


def _seed_today(session):
    user = User(username="alice", email="alice@test.com", password_hash="h")
    org = Organization(name="Org1")
    topic = Topic(title="T", description="D", is_used=True, used_on=TODAY)
    session.add_all([user, org, topic])
    session.commit()
    sub = Submission(user_id=user.id, organization_id=org.id, topic_id=topic.id,
                     date=TODAY, image_url="http://img/today")
    session.add(sub)
    session.commit()
    return user, org, topic, sub


def _seed_past(session):
    user = User(username="bob", email="bob@test.com", password_hash="h")
    org = Organization(name="Org2")
    topic = Topic(title="Past", description="D", is_used=True, used_on=YESTERDAY)
    session.add_all([user, org, topic])
    session.commit()
    sub = Submission(user_id=user.id, organization_id=org.id, topic_id=topic.id,
                     date=YESTERDAY, image_url="http://img/past")
    session.add(sub)
    session.commit()
    return user, org, topic, sub


# ============================================================== Tab 1 — daily feed

class TestDailyFeed:
    def test_returns_todays_submissions(self, client, app):
        with app.app_context():
            _, _, _, sub = _seed_today(db.session)
            sub_id = str(sub.id)
        resp = client.get("/api/feed")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["total"] == 1
        assert body["submissions"][0]["id"] == sub_id

    def test_is_empty_when_no_one_has_submitted_today(self, client, app):
        """At the start of a new day, the daily feed must be empty."""
        with app.app_context():
            _seed_past(db.session)  # only past submissions exist
        resp = client.get("/api/feed")
        assert resp.get_json()["total"] == 0

    def test_excludes_past_days(self, client, app):
        with app.app_context():
            user, org, topic, _ = _seed_today(db.session)
            db.session.add(Submission(user_id=user.id, organization_id=org.id,
                                      topic_id=topic.id, date=YESTERDAY, image_url="http/old"))
            db.session.commit()
        assert client.get("/api/feed").get_json()["total"] == 1

    def test_filters_by_organization(self, client, app):
        with app.app_context():
            user, org, topic, _ = _seed_today(db.session)
            other_org = Organization(name="Other")
            db.session.add(other_org)
            db.session.commit()
            db.session.add(Submission(user_id=user.id, organization_id=other_org.id,
                                      topic_id=topic.id, date=TODAY, image_url="http/2"))
            db.session.commit()
            org_id = str(org.id)
        assert client.get(f"/api/feed?organization_id={org_id}").get_json()["total"] == 1

    def test_platform_wide_view_shows_all_orgs(self, client, app):
        """Omitting organization_id returns the combined platform feed."""
        with app.app_context():
            user_a, org_a, topic_a, _ = _seed_today(db.session)
            org_b = Organization(name="OrgB")
            topic_b = Topic(title="T2", description="D", is_used=True, used_on=TODAY)
            db.session.add_all([org_b, topic_b])
            db.session.commit()
            db.session.add(Submission(user_id=user_a.id, organization_id=org_b.id,
                                      topic_id=topic_b.id, date=TODAY, image_url="http/2"))
            db.session.commit()
        body = client.get("/api/feed").get_json()
        assert body["total"] == 2  # both orgs' submissions visible

    def test_paginates(self, client, app):
        with app.app_context():
            user, org, topic, _ = _seed_today(db.session)
            for i in range(4):
                db.session.add(Submission(user_id=user.id, organization_id=org.id,
                                          topic_id=topic.id, date=TODAY, image_url=f"http/{i}"))
            db.session.commit()
        body = client.get("/api/feed?page=1&per_page=2").get_json()
        assert body["total"] == 5
        assert len(body["submissions"]) == 2
        assert body["pages"] == 3

    def test_response_has_required_keys(self, client, app):
        with app.app_context():
            _seed_today(db.session)
        body = client.get("/api/feed").get_json()
        for key in ("submissions", "total", "page", "per_page", "pages"):
            assert key in body


class TestDailyPersonalizedFeed:
    def test_requires_user_id(self, client):
        assert client.get("/api/feed/personalized").status_code == 400

    def test_returns_submissions(self, client, app):
        with app.app_context():
            user, _, _, sub = _seed_today(db.session)
            user_id, sub_id = str(user.id), str(sub.id)
        resp = client.get(f"/api/feed/personalized?user_id={user_id}")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["total"] == 1
        assert body["submissions"][0]["id"] == sub_id

    def test_orders_by_recommendation_score(self, client, app):
        with app.app_context():
            user, org, topic, sub_low = _seed_today(db.session)
            sub_high = Submission(user_id=user.id, organization_id=org.id,
                                  topic_id=topic.id, date=TODAY, image_url="http/high")
            db.session.add(sub_high)
            db.session.commit()
            db.session.add(RecommendationScore(user_id=user.id,
                                               submission_id=sub_low.id, score=0.1))
            db.session.add(RecommendationScore(user_id=user.id,
                                               submission_id=sub_high.id, score=0.9))
            db.session.commit()
            user_id, high_id = str(user.id), str(sub_high.id)
        resp = client.get(f"/api/feed/personalized?user_id={user_id}")
        assert resp.get_json()["submissions"][0]["id"] == high_id


# ====================================== Tab 2 — all-time gallery (recommendation engine)

class TestAllTimeFeed:
    def test_includes_past_days(self, client, app):
        with app.app_context():
            _, _, _, sub = _seed_past(db.session)
            sub_id = str(sub.id)
        resp = client.get("/api/feed/all")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["total"] == 1
        assert body["submissions"][0]["id"] == sub_id

    def test_excludes_today(self, client, app):
        """Today's work stays in Tab 1 until midnight, then joins the gallery."""
        with app.app_context():
            _seed_today(db.session)
        assert client.get("/api/feed/all").get_json()["total"] == 0

    def test_filters_by_organization(self, client, app):
        with app.app_context():
            user, org, topic, _ = _seed_past(db.session)
            other_org = Organization(name="OtherOrg")
            db.session.add(other_org)
            db.session.commit()
            db.session.add(Submission(user_id=user.id, organization_id=other_org.id,
                                      topic_id=topic.id, date=YESTERDAY, image_url="http/x"))
            db.session.commit()
            org_id = str(org.id)
        assert client.get(f"/api/feed/all?organization_id={org_id}").get_json()["total"] == 1

    def test_organization_gallery_shows_all_time_images(self, client, app):
        """A user can see every image ever uploaded in their organisation across all past days."""
        with app.app_context():
            user, org, topic, _ = _seed_past(db.session)
            for days_ago in range(2, 5):
                db.session.add(Submission(user_id=user.id, organization_id=org.id,
                                          topic_id=topic.id,
                                          date=TODAY - timedelta(days=days_ago),
                                          image_url=f"http/past-{days_ago}"))
            db.session.commit()
            org_id = str(org.id)
        body = client.get(f"/api/feed/all?organization_id={org_id}").get_json()
        assert body["total"] == 4  # 1 from _seed_past + 3 added

    def test_paginates(self, client, app):
        with app.app_context():
            user, org, topic, _ = _seed_past(db.session)
            for i in range(4):
                db.session.add(Submission(user_id=user.id, organization_id=org.id,
                                          topic_id=topic.id, date=YESTERDAY, image_url=f"http/{i}"))
            db.session.commit()
        body = client.get("/api/feed/all?page=1&per_page=2").get_json()
        assert body["total"] == 5
        assert len(body["submissions"]) == 2


class TestAllTimePersonalizedFeed:
    def test_requires_user_id(self, client):
        assert client.get("/api/feed/all/personalized").status_code == 400

    def test_returns_past_submissions(self, client, app):
        with app.app_context():
            user, _, _, sub = _seed_past(db.session)
            user_id, sub_id = str(user.id), str(sub.id)
        resp = client.get(f"/api/feed/all/personalized?user_id={user_id}")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["total"] == 1
        assert body["submissions"][0]["id"] == sub_id

    def test_excludes_today(self, client, app):
        with app.app_context():
            user, _, _, _ = _seed_today(db.session)
            user_id = str(user.id)
        assert client.get(f"/api/feed/all/personalized?user_id={user_id}").get_json()["total"] == 0

    def test_orders_by_recommendation_score(self, client, app):
        with app.app_context():
            user, org, topic, sub_low = _seed_past(db.session)
            sub_high = Submission(user_id=user.id, organization_id=org.id,
                                  topic_id=topic.id, date=YESTERDAY, image_url="http/high")
            db.session.add(sub_high)
            db.session.commit()
            db.session.add(RecommendationScore(user_id=user.id,
                                               submission_id=sub_low.id, score=0.1))
            db.session.add(RecommendationScore(user_id=user.id,
                                               submission_id=sub_high.id, score=0.9))
            db.session.commit()
            user_id, high_id = str(user.id), str(sub_high.id)
        resp = client.get(f"/api/feed/all/personalized?user_id={user_id}")
        assert resp.get_json()["submissions"][0]["id"] == high_id

    def test_filters_by_organization(self, client, app):
        with app.app_context():
            user, org, topic, _ = _seed_past(db.session)
            other_org = Organization(name="OtherOrg")
            db.session.add(other_org)
            db.session.commit()
            db.session.add(Submission(user_id=user.id, organization_id=other_org.id,
                                      topic_id=topic.id, date=YESTERDAY, image_url="http/x"))
            db.session.commit()
            user_id, org_id = str(user.id), str(org.id)
        resp = client.get(f"/api/feed/all/personalized?user_id={user_id}&organization_id={org_id}")
        assert resp.get_json()["total"] == 1

    def test_falls_back_to_recency_when_no_scores(self, client, app):
        """New users with no interaction history get a recency-ordered gallery."""
        with app.app_context():
            user, _, _, _ = _seed_past(db.session)
            user_id = str(user.id)
        resp = client.get(f"/api/feed/all/personalized?user_id={user_id}")
        assert resp.status_code == 200
        assert resp.get_json()["total"] == 1


# ====================================== user drawing history by chosen date

class TestUserSubmissions:
    def test_returns_all_submissions_across_dates(self, client, app):
        with app.app_context():
            user, org, topic, sub_today = _seed_today(db.session)
            db.session.add(Submission(user_id=user.id, organization_id=org.id,
                                      topic_id=topic.id, date=YESTERDAY, image_url="http/old"))
            db.session.commit()
            user_id = str(user.id)
        body = client.get(f"/api/users/{user_id}/submissions").get_json()
        assert body["total"] == 2

    def test_filters_by_chosen_date(self, client, app):
        """A user picks a past date from their profile to see what they drew that day."""
        with app.app_context():
            user, org, topic, _ = _seed_today(db.session)
            sub_old = Submission(user_id=user.id, organization_id=org.id,
                                 topic_id=topic.id, date=YESTERDAY, image_url="http/old")
            db.session.add(sub_old)
            db.session.commit()
            user_id, old_id = str(user.id), str(sub_old.id)
        resp = client.get(f"/api/users/{user_id}/submissions?date={YESTERDAY.isoformat()}")
        body = resp.get_json()
        assert body["total"] == 1
        assert body["submissions"][0]["id"] == old_id

    def test_multi_org_user_has_multiple_submissions_on_same_day(self, client, app):
        """A user in two organisations can have two submissions on the same day."""
        with app.app_context():
            user, org_a, topic_a, sub_a = _seed_today(db.session)
            org_b = Organization(name="OrgB")
            topic_b = Topic(title="T2", description="D", is_used=True, used_on=TODAY)
            db.session.add_all([org_b, topic_b])
            db.session.commit()
            sub_b = Submission(user_id=user.id, organization_id=org_b.id,
                               topic_id=topic_b.id, date=TODAY, image_url="http/org-b")
            db.session.add(sub_b)
            db.session.commit()
            user_id = str(user.id)
        body = client.get(f"/api/users/{user_id}/submissions?date={TODAY.isoformat()}").get_json()
        assert body["total"] == 2

    def test_returns_empty_for_unknown_user(self, client, app):
        with app.app_context():
            _seed_today(db.session)
        resp = client.get(f"/api/users/{uuid.uuid4()}/submissions")
        assert resp.status_code == 200
        assert resp.get_json()["total"] == 0


# ================================================================ archive endpoint

class TestArchiveEndpoint:
    def test_returns_count_for_yesterday(self, client, app):
        with app.app_context():
            _, _, _, sub = _seed_past(db.session)  # 1 submission dated yesterday
        resp = client.post("/api/archive/daily", json={})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["archived_date"] == YESTERDAY.isoformat()
        assert body["submissions_archived"] == 1

    def test_accepts_explicit_date(self, client, app):
        with app.app_context():
            user, org, topic, _ = _seed_past(db.session)
            two_days_ago = TODAY - timedelta(days=2)
            db.session.add(Submission(user_id=user.id, organization_id=org.id,
                                      topic_id=topic.id, date=two_days_ago, image_url="http/2d"))
            db.session.commit()
        resp = client.post("/api/archive/daily",
                           json={"date": two_days_ago.isoformat()})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["archived_date"] == two_days_ago.isoformat()
        assert body["submissions_archived"] == 1

    def test_returns_zero_when_no_submissions_on_date(self, client, app):
        with app.app_context():
            _seed_today(db.session)
        resp = client.post("/api/archive/daily", json={})
        assert resp.get_json()["submissions_archived"] == 0


# ================================================ single submission and CF endpoints

class TestSingleSubmission:
    def test_returns_submission(self, client, app):
        with app.app_context():
            _, _, _, sub = _seed_today(db.session)
            sub_id = str(sub.id)
        resp = client.get(f"/api/submissions/{sub_id}")
        assert resp.status_code == 200
        assert resp.get_json()["submission"]["id"] == sub_id

    def test_returns_404_for_unknown_id(self, client, app):
        with app.app_context():
            _seed_today(db.session)
        assert client.get(f"/api/submissions/{uuid.uuid4()}").status_code == 404

    def test_returns_404_for_invalid_uuid(self, client, app):
        with app.app_context():
            _seed_today(db.session)
        assert client.get("/api/submissions/not-a-uuid").status_code == 404


class TestSimilarDrawings:
    def test_returns_list(self, client, app):
        with app.app_context():
            _, _, _, sub = _seed_today(db.session)
            sub_id = str(sub.id)
        resp = client.get(f"/api/submissions/{sub_id}/similar")
        assert resp.status_code == 200
        assert "similar_drawings" in resp.get_json()

    def test_returns_404_for_invalid_uuid(self, client, app):
        with app.app_context():
            _seed_today(db.session)
        assert client.get("/api/submissions/not-a-uuid/similar").status_code == 404


class TestRecommendedArtists:
    def test_returns_list(self, client, app):
        with app.app_context():
            user, _, _, _ = _seed_today(db.session)
            user_id = str(user.id)
        resp = client.get(f"/api/users/{user_id}/recommended-artists")
        assert resp.status_code == 200
        assert "recommended_artist_ids" in resp.get_json()
