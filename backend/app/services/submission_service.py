from datetime import date

from ..exceptions import NotFoundError, ValidationError


class SubmissionService:
    def __init__(self, prompt_repository, submission_repository):
        self.prompt_repository = prompt_repository
        self.submission_repository = submission_repository

    def submit_drawing(self, payload):
        user_id = payload.get("user_id")
        prompt_id = payload.get("prompt_id")
        image_data = (payload.get("image_data") or "").strip()

        if user_id is None or prompt_id is None or not image_data:
            raise ValidationError("user_id, prompt_id and image_data are required")

        prompt = self.prompt_repository.get_prompt(prompt_id)
        if not prompt:
            raise NotFoundError("Prompt not found")

        organization_id = payload.get("organization_id")
        if organization_id is None:
            raise ValidationError("organization_id is required")

        daily_prompt = self.prompt_repository.get_daily_prompt(
            organization_id, date.today()
        )
        if not daily_prompt or daily_prompt.prompt_id != prompt.id:
            raise ValidationError("Submissions are allowed only for today's prompt")

        if self.submission_repository.has_submission_for_prompt_today(user_id, prompt_id):
            raise ValidationError("User already submitted a drawing for today's prompt")

        return self.submission_repository.create_submission(
            user_id=user_id,
            organization_id=organization_id,
            prompt_id=prompt_id,
            image_data=image_data,
            caption=payload.get("caption"),
        )
