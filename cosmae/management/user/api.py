"API endpoints for managing users."

from logging import getLogger

from allauth.account import signals
from allauth.account.models import Login
from allauth.headless.account.inputs import SignupInput
from django.conf import settings
from django.db import DatabaseError, IntegrityError, transaction
from django.http import HttpRequest
from ninja import Field, Router, Schema

from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.user.adapter import AccountExistsException
from cosmae.user.model_conversion.login import user_db_to_login_response
from cosmae.user.models_api.login import LoginResponse
from cosmae.user.models_api.public import permission_group_api_to_db
from cosmae.user.ssh.models_django import SshKey
from cosmae.util import CosmaeUser
from cosmae.util.auth import (
    ErrorListAllauthLikeResponse,
    SuccessAllauthLikeResponse,
    check_user,
    single_error_allauth_like_response,
    success_allauth_like_response,
)


class PutGroupRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for body of request setting the permission group of a user."
    permission_group: str | None = None
    is_active: bool | None = None


class CreateUserRequest(Schema):
    "API model for register requests."

    username: str = Field(None, min_length=2, max_length=150)
    names_personal: str = Field(None, min_length=2, max_length=150)
    names_family: str | None = Field(None, min_length=2, max_length=150)
    email: str = Field(None, min_length=2, max_length=150)
    password: str = Field(None, min_length=8, max_length=50)
    ssh_key: str | None = Field(None, min_length=5)

    def __str__(self) -> str:
        as_dict = super().dict()
        as_dict.pop("password")
        return str(as_dict)


router = Router()
_LOGGER = getLogger(__name__)


def send_mail(request, login):
    "Send a link for email verification."
    from allauth.account.stages import (  # pylint: disable=import-outside-toplevel
        EmailVerificationStage,
    )

    email_stage = EmailVerificationStage(None, request, login)
    email_stage.handle()
    return email_stage


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
        return single_error_allauth_like_response(401, msg="Not authenticated")
    if settings.USE_SSH and user_request_data.ssh_key is None:
        return single_error_allauth_like_response(400, msg="SSH key is required.")
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
                send_mail(request, login)
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
        return single_error_allauth_like_response(400, exc.msg)
    except Exception as exc:  # pylint: disable=broad-except:
        _LOGGER.error("", exc_info=exc)
        return single_error_allauth_like_response(500, "Could not create user")


@router.put(
    "/id/{id_user_persistent}/permission_group",
    response={
        200: LoginResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def put_user_permission_group(  # pylint: disable=too-many-return-statements
    request: HttpRequest, id_user_persistent: str, request_body: PutGroupRequest
):
    "API method for setting the user permission group"
    try:
        try:
            request_user = check_user(request)
        except NotAuthenticatedException:
            return 401, ApiError(msg="Not authenticated")
        if request_user.permission_group != CosmaeUser.COMMISSIONER:
            return 403, ApiError(msg="Insufficient permissions.")
        user = CosmaeUser.objects.filter(
            id_persistent=id_user_persistent
        ).get()  # pylint: disable=no-member
        if user == request_user:
            return 400, ApiError(msg="You can not change your own permission group.")
        if user.is_superuser:
            return 400, ApiError(
                msg="Can not change the permission group  of a super user."
            )
        if request_body.permission_group is not None:
            user.permission_group = permission_group_api_to_db[
                request_body.permission_group
            ]
        if request_body.is_active is not None:
            user.is_active = request_body.is_active
        user.save()
        return 200, user_db_to_login_response(user)
    except CosmaeUser.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="User does not exist.")
    except KeyError:
        return 400, ApiError(msg="Unknown permission group")
    except DatabaseError:
        return 500, ApiError(msg="Could not store the permission in the database.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not set permission group of user.")


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
