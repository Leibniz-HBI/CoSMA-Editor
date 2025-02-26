"Utils for authentication"

from enum import Enum

from django.http import HttpRequest
from ninja.security import django_auth

from cosmae.exception import NotAuthenticatedException
from cosmae.util import CosmaeUser


class CosmaePermission(Enum):
    # pylint: disable=too-few-public-methods
    "Permissions for CoSMA-E"
    READ_DATA = "READ_DATA"
    UPLOAD_DATA = "UPLOAD_DATA"
    ASSIGN_CONTRIBUTOR = "ASSIGN_CONTRIBUTOR"
    REVIEW_DATA = "REVIEW_DATA"
    ASSIGN_GROUP = "ASSIGN_GROUP"


class CosmaeGroup(Enum):
    # pylint: disable=too-few-public-methods
    "Groups for CoSMA-E"
    APPLICANT = "APPLICANT"
    READER = "READER"
    CONTRIBUTOR = "CONTRIBUTOR"
    EDITOR = "EDITOR"
    COMMISSIONER = "COMMISSIONER"


def cosmae_auth(request: HttpRequest):
    """Workaround for cookie authentication.
    This is required to have sub paths without authorization
    where the parents use authorization."""
    return django_auth.authenticate(request, None)


def check_user(request, require_2fa=True):
    "Checks wether a request is authenticated, otherwise throws an exception."
    user = request.user
    if isinstance(user, CosmaeUser):
        if require_2fa:
            mfa_completed = check_mfa(request)
            if not mfa_completed:
                raise NotAuthenticatedException()
        return user
    raise NotAuthenticatedException()


def check_mfa(request):
    "Check whether the request is authenticated using MFA."
    return any(
        method.get("type") == "totp"
        for method in request.session.get("account_authentication_methods", [])
    )
