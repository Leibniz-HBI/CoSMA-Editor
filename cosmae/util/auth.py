"Utils for authentication"

from enum import Enum
from typing import Generic, List, Optional, Tuple, TypeVar

from django.conf import settings
from django.http import HttpRequest
from ninja import Schema
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


def no_auth(request: HttpRequest):
    "No authentication for unittests."
    return request


cosmae_auth = no_auth if settings.IS_UNITTEST else django_auth


def check_user(request, require_2fa=True, require_password_changed=True):
    "Checks wether a request is authenticated, otherwise throws an exception."
    user = request.user
    if isinstance(user, CosmaeUser):
        if require_2fa:
            mfa_completed = check_mfa(request)
            if not mfa_completed:
                raise NotAuthenticatedException()
        if not user.password_changed and require_password_changed:
            raise NotAuthenticatedException()
        return user
    raise NotAuthenticatedException()


def check_mfa(request):
    "Check whether the request is authenticated using MFA."
    return any(
        method.get("type") == "totp"
        for method in request.session.get("account_authentication_methods", [])
    )


class MetaAllauthLikeResponse(Schema):
    """Response similar to the allauth meta field"""

    is_authenticated: bool


class ErrorAllauthLikeResponse(Schema):
    """Response for errors similar to allauth"""

    message: str
    code: str
    param: str


class BaseAllauthLikeResponse(Schema):
    """Base Response that is similar to allauth Response"""

    status: int


class ErrorListAllauthLikeResponse(BaseAllauthLikeResponse):
    "General error response similar to allauth"

    errors: List[ErrorAllauthLikeResponse]


class FlowAllauthLikeResponse(Schema):
    "Response for an allauth flow"

    id: str
    is_pending: Optional[bool] = None


class FlowListAllauthLikeResponse(Schema):
    "Response for a list off allauth flows."

    flows: List[FlowAllauthLikeResponse]


class UnauthorizedAllauthLikeResponse(BaseAllauthLikeResponse):
    "Allauth style unauthorized response."

    status: int = 401
    errors: Optional[ErrorListAllauthLikeResponse] = None
    data: FlowListAllauthLikeResponse
    meta: MetaAllauthLikeResponse


SchemaExtension = TypeVar("SchemaExtension", bound=Schema)


class SuccessAllauthLikeResponse(BaseAllauthLikeResponse, Generic[SchemaExtension]):
    "Allauth style success response."

    status: int = 200
    data: SchemaExtension
    meta: Optional[MetaAllauthLikeResponse]


def single_error_allauth_like_response(
    status: int, msg: str, param="", code=""
) -> ErrorListAllauthLikeResponse:
    "Create an allauth like error response with a single message."
    return status, ErrorListAllauthLikeResponse(
        errors=[ErrorAllauthLikeResponse(message=msg, param=param, code=code)],
        status=status,
    )


def success_allauth_like_response(
    data: SchemaExtension,
) -> Tuple[int, SuccessAllauthLikeResponse[SchemaExtension]]:
    "Create an allauth like response for success."
    return 200, SuccessAllauthLikeResponse(status=200, data=data, meta=None)
