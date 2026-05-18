from datetime import date

import click
from flask import current_app

from .container import make_prompt_scheduler, make_prompt_service, make_recommendation_service


def _parse_date(value):
    if value is None:
        return date.today()
    return date.fromisoformat(value)


def register_cli(app):
    @app.cli.command("select-daily-prompts")
    @click.option("--date", "prompt_date", default=None, help="Date in YYYY-MM-DD format.")
    def select_daily_prompts(prompt_date):
        selected = make_prompt_service().select_daily_prompts_for_all_organizations(
            _parse_date(prompt_date)
        )
        click.echo(f"Selected {len(selected)} daily prompts.")

    @app.cli.command("recalculate-recommendations")
    def recalculate_recommendations():
        updated = make_recommendation_service().recalculate_scores()
        click.echo(f"Recalculated {len(updated)} recommendation scores.")

    @app.cli.command("run-daily-cron")
    @click.option("--date", "prompt_date", default=None, help="Date in YYYY-MM-DD format.")
    def run_daily_cron(prompt_date):
        with current_app.app_context():
            results = make_prompt_scheduler().run_daily_jobs(_parse_date(prompt_date))
        click.echo(
            "Daily cron completed: "
            + ", ".join(
                f"{name}={len(result) if isinstance(result, list) else result}"
                for name, result in sorted(results.items())
            )
        )
