from app.scheduler.prompt_scheduler import PromptScheduler


class FakePromptService:
    def __init__(self):
        self.called = False

    def select_daily_prompts_for_all_organizations(self, current_date=None):
        self.called = True
        return ["daily-prompt"]


class FakeRecommendationService:
    def __init__(self):
        self.called = False

    def recalculate_scores(self):
        self.called = True
        return ["score"]


def test_prompt_scheduler_runs_daily_jobs_in_parallel_consumers():
    prompt_service = FakePromptService()
    recommendation_service = FakeRecommendationService()

    results = PromptScheduler(prompt_service, recommendation_service).run_daily_jobs()

    assert prompt_service.called is True
    assert recommendation_service.called is True
    assert results["select_daily_prompts"] == ["daily-prompt"]
    assert results["recalculate_recommendation_scores"] == ["score"]
