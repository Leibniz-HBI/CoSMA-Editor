"API endpoints for handling user management."

from typing import Union
from urllib.parse import unquote
from uuid import uuid4

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import AnonymousUser, Group
from django.db import DatabaseError, IntegrityError
from django.http import HttpRequest
from ninja import Router, Schema
from ninja.constants import NOT_SET

from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.tag.api.models_conversion import tag_definition_db_to_api
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.user.models_api.login import (
    LoginRequest,
    LoginResponse,
    LoginResponseList,
    RegisterRequest,
    SearchResponse,
)
from cosmae.user.models_conversion import (
    permission_group_db_to_api,
    user_db_to_public_user_info,
)
from cosmae.util import EmptyResponse, CosmaeUser
from cosmae.util.auth import CosmaeGroup, check_user, cosmae_auth


class PutGroupRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for body of request setting the permission group of a user."
    permission_group: str


router = Router()


@router.post("login", auth=NOT_SET, response={200: Union[LoginResponse, ApiError]})
def login_post(request, credentials: LoginRequest):
    "API endpoint for login"
    user = authenticate(
        request, username=credentials.name, password=credentials.password
    )
    if user is None:
        return 200, ApiError(msg="Invalid credentials.")
    login(request, user)
    return 200, user_db_to_login_response(user)


@router.post("logout", auth=cosmae_auth, response=None)
def logout_post(request: HttpRequest):
    "API endpoint for logout"
    logout(request)
    return 200, None


@router.get("refresh", response={200: LoginResponse, 401: EmptyResponse})
def refresh_get(request):
    "Endpoint for refreshing a session."
    user = request.user
    if isinstance(user, AnonymousUser):
        return 401, EmptyResponse
    return 200, user_db_to_login_response(user)


@router.post(
    "register",
    auth=NOT_SET,
    response={200: LoginResponse, 500: ApiError, 400: ApiError},
)
def register_post(
    request, registration_info: RegisterRequest
):  # pylint: disable=unused-argument
    "API endpoint for registration"
    try:
        permission_group = CosmaeUser.APPLICANT
        if not (settings.DEBUG or settings.IS_UNITTEST):
            if len(CosmaeUser.objects.exclude(is_superuser=True)) == 0:
                permission_group = CosmaeUser.COMMISSIONER
        user = CosmaeUser.objects.create_user(
            username=registration_info.username,
            email=registration_info.email,
            password=registration_info.password,
            first_name=registration_info.names_personal,
            id_persistent=uuid4(),
            permission_group=permission_group,
        )
        if user.last_name and user.last_name != "":
            user.last_name = registration_info.names_family
        user.groups.set([Group.objects.get(name=str(CosmaeGroup.APPLICANT))])
        user.save()
        return 200, user_db_to_login_response(user)
    except IntegrityError as exc:
        if str(exc.args[0]).startswith("duplicate"):
            return 400, ApiError(msg="Username or mail address already in use.")
        return 500, ApiError(msg="Could not create user.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not create user.")


@router.post(
    "/tag_definitions/append/{id_tag_definition_persistent}",
    response={200: None, 400: ApiError, 401: ApiError, 500: ApiError},
)
def post_append_tag_definition_id_persistent(
    request: HttpRequest, id_tag_definition_persistent: str
):
    """API method for adding a tag definition given by its persistent id
    to the end of the user profile tag definitions."""
    try:
        user = check_user(request)
        TagDefinitionDb.most_recent_by_id(id_tag_definition_persistent)
        user.append_tag_definition_by_id(id_tag_definition_persistent)
        user.save()
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except TagDefinitionDb.DoesNotExist:  # pylint: disable=no-member
        return 400, ApiError(
            msg="There is no tag definition with the provided persistent id."
        )
    except DatabaseError:
        return 500, ApiError(
            msg="Could not add the persistent tag definition id to the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not add the persistent tag definition id to the user profile."
        )


@router.delete(
    "/tag_definitions/{id_tag_definition_persistent}",
    response={200: None, 400: ApiError, 401: ApiError, 500: ApiError},
)
def delete_tag_definition_id_persistent(
    request: HttpRequest, id_tag_definition_persistent: str
):
    "API method for removing a tag definition given by its persistent id from the user profile."
    try:
        user = check_user(request)
        user.remove_tag_definition_by_id(id_tag_definition_persistent)
        user.save()
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not delete the persistent tag definition id from the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not delete the persistent tag definition id from the user profile."
        )


@router.post(
    "/tag_definitions/change/{start_idx}/{end_idx}",
    response={200: None, 400: ApiError, 401: ApiError, 500: ApiError},
)
def change_tag_definitions_by_idx(request: HttpRequest, start_idx: int, end_idx: int):
    "API method for removing a tag definition given by its persistent id from the user profile."
    try:
        user = check_user(request)
        user.swap_tag_definition_idx(start_idx, end_idx)
        user.save()
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except IndexError:
        return 400, ApiError(
            msg="Persistent tag definition at the index does not exist."
        )
    except DatabaseError:
        return 500, ApiError(
            msg="Could not switch the persistent tag definition ids in the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not switch the persistent tag definition ids in the user profile."
        )


@router.put(
    "/{id_user_persistent}/permission_group",
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
            if user.id > max_id:
                max_id = user.id
        return 200, LoginResponseList(
            user_list=[user_db_to_login_response(user) for user in users],
            next_offset=max_id + 1,
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested chunk.")


@router.get(
    "search/{username}",
    response={200: SearchResponse, 400: ApiError, 401: ApiError, 500: ApiError},
)
def get_search(request: HttpRequest, username: str):
    "API method for searching user by username"
    try:
        user = check_user(request)
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


permission_group_api_to_db = {
    "APPLICANT": CosmaeUser.APPLICANT,
    "READER": CosmaeUser.READER,
    "CONTRIBUTOR": CosmaeUser.CONTRIBUTOR,
    "EDITOR": CosmaeUser.EDITOR,
    "COMMISSIONER": CosmaeUser.COMMISSIONER,
}


def user_db_to_login_response(user: CosmaeUser):
    "Converts a django user to a login response."
    tag_definition_db = user.tag_definitions.copy()
    tag_definitions = []
    for id_tag_definition_persistent in tag_definition_db:
        try:
            tag_definition = TagDefinitionDb.most_recent_by_id(
                id_tag_definition_persistent
            )
            tag_definitions.append(tag_definition_db_to_api(tag_definition))
        except TagDefinitionDb.DoesNotExist:  # pylint: disable=no-member
            user.remove_tag_definition_by_id(id_tag_definition_persistent)
    return LoginResponse(
        username=user.get_username(),
        id_persistent=str(user.id_persistent),
        names_personal=user.first_name,
        names_family=user.last_name,
        email=user.email,
        tag_definition_list=tag_definitions,
        permission_group=permission_group_db_to_api[user.permission_group],
    )
