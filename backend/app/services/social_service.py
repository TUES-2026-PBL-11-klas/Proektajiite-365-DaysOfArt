from datetime import date

from ..exceptions import NotFoundError, ValidationError


class SocialService:
    def __init__(self, social_repository):
        self.repo = social_repository

    def _get_submission_or_404(self, submission_id):
        submission = self.repo.get_submission(submission_id)
        if not submission:
            raise NotFoundError("Submission not found")
        return submission

    def _validate_today_and_not_owner(self, submission, user_id):
        if submission.date != date.today():
            raise ValidationError("Action allowed only on today's submissions")
        if str(submission.user_id) == str(user_id):
            raise ValidationError("Cannot interact with your own submission")


    def add_like(self, payload):
        user_id       = payload.get("user_id")
        submission_id = payload.get("submission_id")
        if not user_id or not submission_id:
            raise ValidationError("user_id and submission_id are required")

        submission = self._get_submission_or_404(submission_id)
        self._validate_today_and_not_owner(submission, user_id)
        return self.repo.add_like(user_id, submission_id)

    def remove_like(self, payload):
        user_id       = payload.get("user_id")
        submission_id = payload.get("submission_id")
        if not user_id or not submission_id:
            raise ValidationError("user_id and submission_id are required")

        submission = self._get_submission_or_404(submission_id)
        self._validate_today_and_not_owner(submission, user_id)
        self.repo.remove_like(user_id, submission_id)


    def add_comment(self, payload):
        user_id       = payload.get("user_id")
        submission_id = payload.get("submission_id")
        content       = (payload.get("content") or "").strip()
        if not user_id or not submission_id or not content:
            raise ValidationError("user_id, submission_id and content are required")

        submission = self._get_submission_or_404(submission_id)
        self._validate_today_and_not_owner(submission, user_id)
        return self.repo.add_comment(user_id, submission_id, content)

    def get_comments(self, submission_id):
        if not submission_id:
            raise ValidationError("submission_id is required")
        self._get_submission_or_404(submission_id)
        return self.repo.get_comments(submission_id)

    def get_leaderboard(self, organization_id, limit=10):
        if not organization_id:
            raise ValidationError("organization_id is required")
        return self.repo.get_top_submissions_today(organization_id, limit)