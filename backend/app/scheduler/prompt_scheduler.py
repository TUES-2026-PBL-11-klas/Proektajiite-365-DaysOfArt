from dataclasses import dataclass
from datetime import date
from threading import Thread
from typing import Callable

from flask import current_app, has_app_context

from .prompt_queue import PromptQueue


@dataclass(frozen=True)
class SchedulerJob:
    name: str
    run: Callable


class PromptScheduler:
    def __init__(self, prompt_service, recommendation_service):
        self.prompt_service = prompt_service
        self.recommendation_service = recommendation_service
        self.queue = PromptQueue[SchedulerJob]()

    def produce_daily_jobs(self, current_date=None):
        current_date = current_date or date.today()
        self.queue.put(
            SchedulerJob(
                name="select_daily_prompts",
                run=lambda: self.prompt_service.select_daily_prompts_for_all_organizations(
                    current_date
                ),
            )
        )
        self.queue.put(
            SchedulerJob(
                name="recalculate_recommendation_scores",
                run=self.recommendation_service.recalculate_scores,
            )
        )

    def _consume(self, results, app=None):
        job = self.queue.get()
        if job is None:
            return

        def execute():
            try:
                results[job.name] = job.run()
            finally:
                self.queue.mark_done()

        if app is None:
            execute()
            return

        with app.app_context():
            execute()

    def run_daily_jobs(self, current_date=None):
        self.produce_daily_jobs(current_date)
        results = {}
        app = current_app._get_current_object() if has_app_context() else None
        threads = [Thread(target=self._consume, args=(results, app)) for _ in range(2)]

        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        return results
