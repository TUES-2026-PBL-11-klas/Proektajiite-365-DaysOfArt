from .repositories.prompt_repository import PromptRepository
from .repositories.submission_repository import SubmissionRepository
from .scheduler.prompt_scheduler import PromptScheduler
from .services.prompt_service import PromptService
from .services.recommendation_service import RecommendationService
from .services.submission_service import SubmissionService


def make_prompt_service():
    return PromptService(PromptRepository())


def make_submission_service():
    prompt_repository = PromptRepository()
    submission_repository = SubmissionRepository()
    return SubmissionService(prompt_repository, submission_repository)


def make_recommendation_service():
    return RecommendationService(SubmissionRepository())


def make_prompt_scheduler():
    prompt_repository = PromptRepository()
    submission_repository = SubmissionRepository()
    return PromptScheduler(
        PromptService(prompt_repository),
        RecommendationService(submission_repository),
    )
from .observers.leaderboard_updater import LeaderboardUpdater
from .observers.interaction_tracker import InteractionTracker
from .repositories.social_repository import SocialRepository


def make_social_service():
    social_repo      = SocialRepository()
    submission_repo  = SubmissionRepository()   

    observers = [
        LeaderboardUpdater(social_repo),
        InteractionTracker(submission_repo),
    ]
    return SocialService(social_repo, observers=observers)