class AppError(Exception):
    """Base class for all domain errors. Carries an HTTP status code so the
    route layer can translate it into a JSON response without knowing the
    concrete error type."""

    status_code = 400
    message = "An error occurred"

    def __init__(self, message=None):
        super().__init__(message or self.message)
        if message:
            self.message = message

    def to_dict(self):
        return {"error": self.message}


class ValidationError(AppError):
    status_code = 422
    message = "Invalid input"


class UserAlreadyExistsError(AppError):
    status_code = 409
    message = "A user with this username or email already exists"


class InvalidCredentialsError(AppError):
    status_code = 401
    message = "Invalid email or password"


class UserNotFoundError(AppError):
    status_code = 404
    message = "User not found"


class ForbiddenError(AppError):
    status_code = 403
    message = "You don't have permission to perform this action"


class OrganizationNotFoundError(AppError):
    status_code = 404
    message = "Organization not found"


class AlreadyMemberError(AppError):
    status_code = 409
    message = "User is already a member of this organization"


class NotMemberError(AppError):
    status_code = 404
    message = "User is not a member of this organization"


class AgeNotAllowedError(AppError):
    status_code = 403
    message = "User's age is outside this organization's allowed range"
