class RecommendationService:
    DEFAULT_SUBMISSION_SCORE = 0.1

    def __init__(self, submission_repository):
        self.submission_repository = submission_repository

    def recalculate_scores(self):
        interaction_scores = {
            (row.user_id, row.submission_id): float(row.score)
            for row in self.submission_repository.calculate_interaction_scores()
        }

        updated = []
        for submission in self.submission_repository.list_submissions():
            score = interaction_scores.get(
                (submission.user_id, submission.id), self.DEFAULT_SUBMISSION_SCORE
            )
            updated.append(
                self.submission_repository.upsert_recommendation_score(
                    submission.user_id, submission.id, score
                )
            )
        return updated
