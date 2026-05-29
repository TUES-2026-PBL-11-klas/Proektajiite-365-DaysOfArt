from app.extensions import db
from app.security import PasswordHasher
from app.repositories import UserRepository, OrganizationRepository
from app.repositories.prompt_repository import PromptRepository
from app.repositories.social_repository import SocialRepository
from app.repositories.submission_repository import SubmissionRepository
from app.scheduler.prompt_scheduler import PromptScheduler
from app.observers.interaction_tracker import InteractionTracker
from app.observers.leaderboard_updater import LeaderboardUpdater
from app.services import AuthService, UserService, OrganizationService
from app.services.prompt_service import PromptService
from app.services.recommendation_service import RecommendationService
from app.services.social_service import SocialService
from app.services.submission_service import SubmissionService

_password_hasher = PasswordHasher()


def build_services(session=None):
    """Composition root for auth, profile and organization features."""
    session = session or db.session
    user_repo = UserRepository(session)
    org_repo = OrganizationRepository(session)

    return {
        "auth": AuthService(user_repo, _password_hasher),
        "users": UserService(user_repo),
        "organizations": OrganizationService(org_repo, user_repo),
    }


def make_prompt_service():
    return PromptService(PromptRepository())


def make_submission_service():
    return SubmissionService(PromptRepository(), SubmissionRepository(), OrganizationRepository(db.session))


def make_submission_repository():
    return SubmissionRepository()


def make_recommendation_service():
    return RecommendationService(SubmissionRepository())


def make_social_service():
    social_repo = SocialRepository()
    submission_repo = SubmissionRepository()
    observers = [
        LeaderboardUpdater(social_repo),
        InteractionTracker(submission_repo),
    ]
    return SocialService(social_repo, observers=observers)


def make_prompt_scheduler():
    return PromptScheduler(
        PromptService(PromptRepository()),
        RecommendationService(SubmissionRepository()),
    )
