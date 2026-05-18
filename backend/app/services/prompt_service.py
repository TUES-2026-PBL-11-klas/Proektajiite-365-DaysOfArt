from datetime import date

from ..exceptions import NotFoundError, ValidationError


class PromptService:
    def __init__(self, prompt_repository):
        self.prompt_repository = prompt_repository

    def create_prompt(self, payload):
        title = (payload.get("title") or "").strip()
        description = (payload.get("description") or "").strip()
        if not title or not description:
            raise ValidationError("title and description are required")

        return self.prompt_repository.create_prompt(
            title=title,
            description=description,
            category=payload.get("category"),
            tag=payload.get("tag"),
            organization_id=payload.get("organization_id"),
        )

    def get_or_create_daily_prompt(self, organization_id=None, current_date=None):
        current_date = current_date or date.today()
        daily_prompt = self.prompt_repository.get_daily_prompt(organization_id, current_date)
        if daily_prompt:
            return daily_prompt

        prompt = self.prompt_repository.choose_random_prompt(organization_id)
        if not prompt:
            raise NotFoundError("No prompts are available for this organization")

        return self.prompt_repository.save_daily_prompt(prompt, organization_id, current_date)

    def select_daily_prompts_for_all_organizations(self, current_date=None):
        current_date = current_date or date.today()
        organization_ids = self.prompt_repository.list_organization_ids_with_prompts()
        created = []

        for organization_id in organization_ids:
            if self.prompt_repository.get_daily_prompt(organization_id, current_date):
                continue

            prompt = self.prompt_repository.choose_random_prompt(organization_id)
            if prompt:
                created.append(
                    self.prompt_repository.save_daily_prompt(
                        prompt, organization_id, current_date
                    )
                )

        return created
