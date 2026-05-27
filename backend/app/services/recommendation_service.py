import math
from abc import ABC, abstractmethod
from collections import defaultdict

from ..utils import to_uuid


class RecommendationStrategy(ABC):
    @abstractmethod
    def recommend(self, repository, **kwargs):
        ...


class UserBasedStrategy(RecommendationStrategy):
    """User-user collaborative filtering.

    Computes cosine similarity between users based on their interaction scores,
    then surfaces submissions that the most similar users engaged with but the
    target user has not yet seen.
    """

    _TOP_NEIGHBOURS = 20

    def recommend(self, repository, user_id, limit=10, **kwargs):
        interaction_rows = repository.get_interaction_matrix()

        user_vectors = defaultdict(dict)
        for row in interaction_rows:
            user_vectors[str(row.user_id)][str(row.submission_id)] = float(row.score)

        uid = str(user_id)
        target_vec = user_vectors.get(uid, {})
        if not target_vec:
            return []

        def cosine_similarity(vec_a, vec_b):
            common = set(vec_a) & set(vec_b)
            if not common:
                return 0.0
            dot = sum(vec_a[k] * vec_b[k] for k in common)
            norm_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
            norm_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))
            return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0

        neighbours = sorted(
            (
                (other_uid, cosine_similarity(target_vec, vec))
                for other_uid, vec in user_vectors.items()
                if other_uid != uid
            ),
            key=lambda pair: pair[1],
            reverse=True,
        )[: self._TOP_NEIGHBOURS]

        candidate_scores = defaultdict(float)
        for other_uid, sim in neighbours:
            if sim <= 0:
                continue
            for sub_id, score in user_vectors[other_uid].items():
                if sub_id not in target_vec:
                    candidate_scores[sub_id] += sim * score

        return [
            sub_id
            for sub_id, _ in sorted(
                candidate_scores.items(), key=lambda x: x[1], reverse=True
            )[:limit]
        ]


class SubmissionBasedStrategy(RecommendationStrategy):
    """Item-item collaborative filtering.

    Finds submissions whose audience overlaps most with a given submission's
    audience, weighted by how strongly each shared user engaged with both.
    """

    def recommend(self, repository, submission_id, limit=10, **kwargs):
        sid = str(submission_id)
        interactors = repository.get_users_who_interacted_with(submission_id)
        if not interactors:
            return []

        user_ids = [row.user_id for row in interactors]
        user_weights = {str(row.user_id): float(row.total_score or 1.0) for row in interactors}

        candidate_scores = defaultdict(float)
        for interaction in repository.get_interactions_for_users(user_ids):
            sub_id = str(interaction.submission_id)
            if sub_id != sid:
                weight = user_weights.get(str(interaction.user_id), 1.0)
                candidate_scores[sub_id] += weight * float(interaction.total_score or 0)

        return [
            sub_id
            for sub_id, _ in sorted(
                candidate_scores.items(), key=lambda x: x[1], reverse=True
            )[:limit]
        ]


class RecommendationService:
    DEFAULT_SUBMISSION_SCORE = 0.1

    def __init__(self, submission_repository):
        self.submission_repository = submission_repository
        self._user_strategy = UserBasedStrategy()
        self._submission_strategy = SubmissionBasedStrategy()

    def recalculate_scores(self):
        """Persist pre-computed recommendation scores for the cron job (Person 2)."""
        interaction_scores = {
            (row.user_id, row.submission_id): float(row.score)
            for row in self.submission_repository.calculate_interaction_scores()
        }
        return [
            self.submission_repository.upsert_recommendation_score(
                submission.user_id,
                submission.id,
                interaction_scores.get(
                    (submission.user_id, submission.id), self.DEFAULT_SUBMISSION_SCORE
                ),
            )
            for submission in self.submission_repository.list_submissions()
        ]

    def get_similar_drawings(self, submission_id, limit=10):
        candidate_ids = self._submission_strategy.recommend(
            self.submission_repository, submission_id=submission_id, limit=limit
        )
        return self.submission_repository.get_submissions_by_ids(
            list(map(to_uuid, candidate_ids))
        )

    def get_recommended_artist_ids(self, user_id, limit=10):
        candidate_sub_ids = self._user_strategy.recommend(
            self.submission_repository, user_id=user_id, limit=50
        )
        if not candidate_sub_ids:
            return []
        submissions = self.submission_repository.get_submissions_by_ids(
            list(map(to_uuid, candidate_sub_ids))
        )
        uid = str(user_id)
        seen = set()
        artist_ids = []
        for sub in submissions:
            aid = str(sub.user_id)
            if aid != uid and aid not in seen:
                seen.add(aid)
                artist_ids.append(aid)
            if len(artist_ids) >= limit:
                break
        return artist_ids
