from app.extensions import db
from app.security import PasswordHasher
from app.repositories import UserRepository, OrganizationRepository
from app.repositories.prompt_repository import PromptRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services import AuthService, UserService, OrganizationService
from app.services.prompt_service import PromptService
from app.services.recommendation_service import RecommendationService
from app.services.submission_service import SubmissionService
from app.scheduler.prompt_scheduler import PromptScheduler

_password_hasher = PasswordHasher()


def build_services(session=None):
    """Person 1's composition root. Wires repositories and services for auth,
    profile and organization features. Routes call this instead of constructing
    dependencies themselves."""
    session = session or db.session
    user_repo = UserRepository(session)
    org_repo = OrganizationRepository(session)

    return {
        "auth": AuthService(user_repo, _password_hasher),
        "users": UserService(user_repo),
        "organizations": OrganizationService(org_repo, user_repo),
    }


# Person 2's factories — kept here so prompt/submission routes don't need to
# know about repository wiring.
def make_prompt_service():
    return PromptService(PromptRepository())


def make_submission_service():
    return SubmissionService(PromptRepository(), SubmissionRepository())


def make_submission_repository():
    return SubmissionRepository()


def make_recommendation_service():
    return RecommendationService(SubmissionRepository())


def make_prompt_scheduler():
    return PromptScheduler(
        PromptService(PromptRepository()),
        RecommendationService(SubmissionRepository()),
    )
