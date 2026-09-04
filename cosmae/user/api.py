"API endpoints for handling user management."

from logging import getLogger
from urllib.parse import unquote

from allauth.account.models import EmailAddress
from allauth.account.signals import password_changed as password_changed_signal
from allauth.mfa.models import Authenticator
from django.conf import settings
from django.db import DatabaseError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.models_django import Column as ColumnDb
from cosmae.edit_session.api import EditSession, edit_session_db_to_api
from cosmae.edit_session.models_django import EditSession as EditSessionDb
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.user.adapter import CosmaeAccountAdapter
from cosmae.user.model_conversion.login import user_db_to_login_response
from cosmae.user.model_conversion.public import (
    user_db_to_public_user_info,
)
from cosmae.user.models_api.login import (
    LoginResponse,
    LoginResponseList,
    SearchResponse,
    SetPasswordRequest,
)
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util import CosmaeUser, EmptyResponse
from cosmae.util.auth import (
    ErrorAllauthLikeResponse,
    ErrorListAllauthLikeResponse,
    FlowAllauthLikeResponse,
    FlowListAllauthLikeResponse,
    MetaAllauthLikeResponse,
    SuccessAllauthLikeResponse,
    UnauthorizedAllauthLikeResponse,
    check_mfa,
    check_user,
    single_error_allauth_like_response,
    success_allauth_like_response,
)

_LOGGER = getLogger(__name__)


class PutGroupRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for body of request setting the permission group of a user."
    permission_group: str


class SetEditSessionRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for setting the current edit session."
    id_edit_session_persistent: str


router = Router()


@router.post(
    "/edit_session",
    response={
        200: EditSession,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def set_edit_session(request: HttpRequest, body: SetEditSessionRequest):
    "API method for setting the current edit session of a user."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions")
    try:
        session = EditSessionDb.objects.filter(
            id_persistent=body.id_edit_session_persistent
        ).get()
        if session.id_owner_persistent != user.id_persistent:
            return 403, ApiError(msg="You do not own this session.")
        user.set_current_edit_session(session)
        return 200, edit_session_db_to_api(session)
    except EditSessionDb.DoesNotExist:
        return 404, ApiError(msg="Session does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not set edit session")


@router.post(
    "/columns/append/{id_column_persistent}",
    response={200: None, 400: ApiError, 401: ApiError, 500: ApiError},
)
def post_append_column_id_persistent(request: HttpRequest, id_column_persistent: str):
    """API method for adding a column definition given by its persistent id
    to the end of the user profile columns."""
    try:
        user = check_user(request)
        ColumnDb.most_recent_by_id(id_column_persistent)
        user.append_column_by_id(id_column_persistent)
        user.save()
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except ColumnDb.DoesNotExist:  # pylint: disable=no-member
        return 400, ApiError(msg="There is no column with the provided persistent id.")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not add the persistent column id to the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not add the persistent column id to the user profile."
        )


@router.delete(
    "/columns/{id_column_persistent}",
    response={200: None, 400: ApiError, 401: ApiError, 500: ApiError},
)
def delete_column_id_persistent(request: HttpRequest, id_column_persistent: str):
    "API method for removing a column given by its persistent id from the user profile."
    try:
        user = check_user(request)
        user.remove_column_by_id(id_column_persistent)
        user.save()
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not delete the persistent column id from the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not delete the persistent column id from the user profile."
        )


@router.post(
    "/columns/change/{start_idx}/{end_idx}",
    response={200: None, 400: ApiError, 401: ApiError, 500: ApiError},
)
def change_columns_by_idx(request: HttpRequest, start_idx: int, end_idx: int):
    "API method for removing a column given by its persistent id from the user profile."
    try:
        user = check_user(request)
        user.swap_column_idx(start_idx, end_idx)
        user.save()
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except IndexError:
        return 400, ApiError(msg="Persistent column at the index does not exist.")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not switch the persistent column ids in the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not switch the persistent column ids in the user profile."
        )


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

        user.permission_group = permission_group_api_to_db[
            request_body.permission_group
        ]
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


@router.get(
    "chunks/{offset}/{count}",
    response={
        200: LoginResponseList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get_user_chunk(request: HttpRequest, offset: int, count: int):
    "API method for getting users in chunks."
    try:
        try:
            user = check_user(request)
        except NotAuthenticatedException:
            return 401, ApiError(msg="Not authorized.")
        if user.permission_group != CosmaeUser.COMMISSIONER:
            return 403, ApiError(msg="Insufficient permissions.")
        if count > 5000:
            return 400, ApiError(msg="Request count to large.")
        users = CosmaeUser.chunk_query_set(offset, count)
        max_id = -1
        for user in users:
            max_id = max(user.id, max_id)
        return 200, LoginResponseList(
            user_list=[user_db_to_login_response(user) for user in users],
            next_offset=max_id + 1,
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested chunk.")


@router.get(
    "search/{username}",
    response={
        200: SearchResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get_search(request: HttpRequest, username: str):
    "API method for searching user by username"
    try:
        user = check_user(request)
        if user.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="Insufficient permissions")
        unquoted_username = unquote(username)
        results_db = CosmaeUser.search_username(unquoted_username)
        has_elevated_rights = user.has_elevated_rights()
        if has_elevated_rights:
            results_api = [user_db_to_login_response(user) for user in results_db]
        else:
            results_api = [user_db_to_public_user_info(user) for user in results_db]
        return 200, SearchResponse(
            results=results_api, contains_complete_info=has_elevated_rights
        )
    except NotAuthenticatedException:
        return 401, ApiError(msg="not authenticated")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not search users.")


@router.get(
    "self",
    response={
        200: SuccessAllauthLikeResponse[LoginResponse],
        401: UnauthorizedAllauthLikeResponse,
        500: ErrorListAllauthLikeResponse,
    },
    exclude_none=True,
)
def get_self(request: HttpRequest):
    "Get your own user details."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, create_unauthorized_response(request)
    try:
        user_api = user_db_to_login_response(user)
        return 200, SuccessAllauthLikeResponse[LoginResponse](
            data=user_api, meta=MetaAllauthLikeResponse(is_authenticated=True)
        )
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error("Could not get user info.", exc_info=exc)
        return 500, ErrorListAllauthLikeResponse(
            errors=[
                ErrorAllauthLikeResponse(
                    message="Could not get your user info.", code="", param=""
                )
            ]
        )


@router.post(
    "password",
    response={
        200: SuccessAllauthLikeResponse,
        400: ErrorListAllauthLikeResponse,
        401: ErrorListAllauthLikeResponse,
        403: ErrorListAllauthLikeResponse,
        404: ErrorListAllauthLikeResponse,
        500: ErrorListAllauthLikeResponse,
    },
)
def post_set_password_for_user(request: HttpRequest, data: SetPasswordRequest):
    """Set password for user.
    Either for requesting user or with commissioner for arbitrary user."""
    # pylint: disable=too-many-return-statements
    try:
        request_user = check_user(
            request, require_password_changed=data.id_user_persistent is not None
        )
    except NotAuthenticatedException:
        return single_error_allauth_like_response(401, "Not authenticated")
    try:
        if data.id_user_persistent is not None:
            if request_user.permission_group != CosmaeUser.COMMISSIONER:
                return single_error_allauth_like_response(
                    403, "Insufficient permissions"
                )
            target_user = CosmaeUser.objects.filter(
                id_persistent=data.id_user_persistent
            ).get()
            password_changed = False
        else:
            if data.old_password is None or not request_user.check_password(
                data.old_password
            ):
                return single_error_allauth_like_response(
                    400, "Existing password missing or incorrect."
                )
            if data.old_password == data.new_password:
                return single_error_allauth_like_response(
                    400, "Old password and new password have to be different."
                )
            target_user = request_user
            password_changed = True
        adapter = CosmaeAccountAdapter(request)
        with transaction.atomic():
            adapter.set_password(target_user, data.new_password)
            target_user.password_changed = password_changed
            target_user.save()
            password_changed_signal.send(
                sender=target_user.__class__,
                request=request,
                user=target_user,
            )
        return success_allauth_like_response(EmptyResponse())
    except CosmaeUser.DoesNotExist:
        return single_error_allauth_like_response(404, "User does not exist.")
    except Exception:  # pylint: disable=broad-except
        return single_error_allauth_like_response(500, "Could not change password.")


@router.get(
    "id/{id_user_persistent}",
    response={
        200: PublicUserInfo,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_user(request: HttpRequest, id_user_persistent: str):
    "Get information of a single user."
    try:
        user_request = check_user(request)
        if user_request.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="Insufficient permissions")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        user = CosmaeUser.objects.filter(id_persistent=id_user_persistent).get()
        return 200, user_db_to_public_user_info(user)
    except CosmaeUser.DoesNotExist:
        return 404, ApiError(msg="User does not exist")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="could not get user info")


@router.delete(
    "2fa/{id_user_persistent}",
    response={
        200: None,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def delete_user_2fa(request: HttpRequest, id_user_persistent: str):
    "API method for deleting all 2FA authenticators of a user."
    try:
        request_user = check_user(request)
        if request_user.permission_group != CosmaeUser.COMMISSIONER:
            return 403, ApiError(msg="Insufficient permissions")
        target_user = CosmaeUser.objects.filter(id_persistent=id_user_persistent).get()
        if target_user.id_persistent == request_user.id_persistent:
            return 400, ApiError(msg="You can not delete your own 2FA authenticators.")
        Authenticator.objects.filter(user=target_user).delete()
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except CosmaeUser.DoesNotExist:
        return 404, ApiError(msg="User does not exist")
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Could not delete user's 2FA authenticators."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


permission_group_api_to_db = {
    "APPLICANT": CosmaeUser.APPLICANT,
    "READER": CosmaeUser.READER,
    "CONTRIBUTOR": CosmaeUser.CONTRIBUTOR,
    "EDITOR": CosmaeUser.EDITOR,
    "COMMISSIONER": CosmaeUser.COMMISSIONER,
}


def create_unauthorized_response(request):
    "Collect flows available for (partially) unauthenticated users"
    user = request.user
    flows = [FlowAllauthLikeResponse(id="login"), FlowAllauthLikeResponse(id="signup")]
    is_authenticated = False
    if isinstance(user, CosmaeUser):
        if settings.ACCOUNT_EMAIL_VERIFICATION == "mandatory":
            email_verified_list = EmailAddress.objects.filter(user=user, verified=True)
        else:
            email_verified_list = [None]
        if len(email_verified_list) == 0:
            flows = [FlowAllauthLikeResponse(id="verify_email", is_pending=True)]
        elif not check_mfa(request):
            authenticators = Authenticator.objects.filter(user=user)
            if len(authenticators) > 0:
                flows = [
                    FlowAllauthLikeResponse(id="mfa_reauthenticate", is_pending=True)
                ]
                is_authenticated = True

            else:
                flows = [FlowAllauthLikeResponse(id="mfa_register", is_pending=True)]
        elif not user.password_changed:
            flows = [FlowAllauthLikeResponse(id="password_change", is_pending=True)]
            is_authenticated = True
    return UnauthorizedAllauthLikeResponse(
        meta=MetaAllauthLikeResponse(is_authenticated=is_authenticated),
        data=FlowListAllauthLikeResponse(flows=flows),
    )
