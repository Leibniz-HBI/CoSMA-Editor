"API endpoints for managing users."

from logging import getLogger

from allauth.account import signals
from allauth.account.models import Login
from allauth.account.stages import EmailVerificationStage
from allauth.headless.account.inputs import SignupInput
from django.db import IntegrityError, transaction
from ninja import Field, Router, Schema

from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.user.adapter import AccountExistsException
from cosmae.user.model_conversion.login import user_db_to_login_response
from cosmae.user.ssh.models_django import SshKey
from cosmae.util import CosmaeUser
from cosmae.util.auth import (
    ErrorListAllauthLikeResponse,
    SuccessAllauthLikeResponse,
    check_user,
    single_error_allauth_like_response,
    success_allauth_like_response,
)


class CreateUserRequest(Schema):
    "API model for register requests."

    username: str = Field(None, min_length=2, max_length=150)
    names_personal: str = Field(None, min_length=2, max_length=150)
    names_family: str | None = Field(None, min_length=2, max_length=150)
    email: str = Field(None, min_length=2, max_length=150)
    password: str = Field(None, min_length=8, max_length=50)
    ssh_key: str = Field(None, min_length=5)

    def __str__(self) -> str:
        as_dict = super().dict()
        as_dict.pop("password")
        return str(as_dict)


router = Router()
_LOGGER = getLogger(__name__)


@router.post(
    "",
    response={
        200: SuccessAllauthLikeResponse,
        400: ErrorListAllauthLikeResponse,
        401: ErrorListAllauthLikeResponse,
        403: ErrorListAllauthLikeResponse,
        500: ErrorListAllauthLikeResponse,
    },
)
def post_create_user(request, user_request_data: CreateUserRequest):
    # pylint: disable=too-many-return-statements
    "Create a new user"
    try:
        user_request = check_user(request)
        if user_request.permission_group != CosmaeUser.COMMISSIONER:
            return single_error_allauth_like_response(403, "Insufficient permissions.")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        signup_input = user_to_allauth(user_request_data)
        with transaction.atomic():
            user_created, allauth_rsp = signup_input.try_save(request)
            if not allauth_rsp:
                signals.user_signed_up.send(
                    sender=user_created.__class__,
                    request=request,
                    user=user_created,
                )
                login = Login(
                    user=user_created,
                    email_verification=None,
                    signal_kwargs=None,
                    signup=True,
                )
                email_stage = EmailVerificationStage(None, request, login)
                email_stage.handle()
                return success_allauth_like_response(
                    user_db_to_login_response(user_created)
                )
        return single_error_allauth_like_response(500, "Error while creating user")
    except (IntegrityError, AccountExistsException) as exc:
        _LOGGER.error("", exc_info=exc)
        return single_error_allauth_like_response(
            400, "Username or mail address already in use."
        )
    except SshKey.InvalidSshKeyException as exc:
        return 400, ApiError(msg=exc.msg)
    except Exception as exc:  # pylint: disable=broad-except:
        _LOGGER.error("", exc_info=exc)
        return single_error_allauth_like_response(500, "Could not create user")


def user_to_allauth(user_data: CreateUserRequest) -> SignupInput:
    "Create an allauth compatible signup input"
    signup_input = SignupInput(
        data={
            "username": user_data.username,
            "password": user_data.password,
            "email": user_data.email,
            "names_personal": user_data.names_personal,
            "names_family": user_data.names_family,
            "ssh_key": user_data.ssh_key,
        }
    )
    signup_input.full_clean()
    return signup_input
