from datetime import date
from email_validator import validate_email, EmailNotValidError
from app.exceptions import ValidationError

USERNAME_MIN = 3
USERNAME_MAX = 50
PASSWORD_MIN = 8
MAX_AGE_YEARS = 120


def require(value, field):
    if value is None or (isinstance(value, str) and value.strip() == ""):
        raise ValidationError(f"'{field}' is required")
    return value


def validate_username(username):
    require(username, "username")
    username = username.strip()
    if not (USERNAME_MIN <= len(username) <= USERNAME_MAX):
        raise ValidationError(
            f"Username must be between {USERNAME_MIN} and {USERNAME_MAX} characters"
        )
    return username


def validate_email_address(email):
    require(email, "email")
    try:
        result = validate_email(email, check_deliverability=False)
    except EmailNotValidError as exc:
        raise ValidationError(str(exc))
    return result.normalized


def validate_password(password):
    require(password, "password")
    if len(password) < PASSWORD_MIN:
        raise ValidationError(
            f"Password must be at least {PASSWORD_MIN} characters long"
        )
    return password


def validate_birth_date(birth_date):
    if birth_date is None:
        return None
    if not isinstance(birth_date, date):
        raise ValidationError("birth_date must be a date")
    today = date.today()
    if birth_date > today:
        raise ValidationError("Birth date cannot be in the future")
    age = today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )
    if age > MAX_AGE_YEARS:
        raise ValidationError(f"Birth date implies an age above {MAX_AGE_YEARS}")
    return birth_date
