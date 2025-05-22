"API methods for managing permissions. Currently only works for columns."

from typing import List, Optional

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.models_django import Column
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.permissions.models_django import Permission
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user

router = Router()


class PartialPermissionSet(Schema):
    # pylint: disable=too-few-public-methods
    "A partial permission set used for requests"
    read: Optional[bool]
    write: Optional[bool]


class PermissionSet(Schema):
    # pylint: disable=too-few-public-methods
    "A permission configuration"
    read: bool
    write: bool


class UserPermissionSet(PermissionSet):
    # pylint: disable=too-few-public-methods
    "A permission configuration including the pertaining user."
    id_user_persistent: str


class UserPermissionSetList(Schema):
    # pylint: disable=too-few-public-methods
    "Multiple user permissions"
    user_permission_list: List[UserPermissionSet]


@router.get(
    "/resource/{id_resource_persistent}",
    response={
        200: UserPermissionSetList,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_permissions(request: HttpRequest, id_resource_persistent: str):
    "Get the permissions for a resource"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not Authenticated")
    try:
        if user.permission_group == CosmaeUser.APPLICANT or not Permission.is_owner(
            id_resource_persistent, user
        ):
            return 403, ApiError(msg="Insufficient permissions.")
        permission_list_db = Permission.objects.filter(
            id_resource_persistent=id_resource_persistent
        )
        return 200, UserPermissionSetList(
            user_permission_list=[
                permission_db_to_user_permission_api(permission)
                for permission in permission_list_db
            ]
        )
    except Column.DoesNotExist:
        return 404, ApiError(msg="Resource does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not set permission.")


@router.put(
    "{id_resource_persistent}/{id_user_persistent}",
    response={
        200: PermissionSet,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def put_permission(
    request: HttpRequest,
    id_resource_persistent: str,
    id_user_persistent: str,
    permissions: PartialPermissionSet,
):
    "Set permissions for a resource"
    try:
        user_request = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        if (
            user_request.permission_group == CosmaeUser.APPLICANT
            or not Permission.is_owner(id_resource_persistent, user_request)
        ):
            return 403, ApiError(msg="Insufficient permissions.")
        user_target = CosmaeUser.objects.filter(id_persistent=id_user_persistent).get()
        try:
            permission = Permission.objects.filter(
                id_resource_persistent=id_resource_persistent, user=user_target
            ).get()
            if permissions.read is not None:
                permission.read = permissions.read
            if permissions.write is not None:
                permission.write = permissions.write
            if not (permission.read or permission.write):
                permission.delete()
            else:
                permission.save()
        except Permission.DoesNotExist:
            if not (permissions.read is None and permissions.write is None):
                permission = Permission.objects.create(
                    id_resource_persistent=id_resource_persistent,
                    user=user_target,
                    read=permissions.read is not None and permissions.read,
                    write=permissions.write is not None and permissions.write,
                )
        return 200, permission_db_to_api(permission)
    except (Column.DoesNotExist, CosmaeUser.DoesNotExist):
        return 404, ApiError(msg="Resource or User do not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not set permission.")


def permission_db_to_user_permission_api(permission: Permission) -> UserPermissionSet:
    "Transform a permission from DB to API representation, including the pertaining user."
    return UserPermissionSet(
        read=permission.read,
        write=permission.write,
        id_user_persistent=permission.user.id_persistent,
    )


def permission_db_to_api(permission: Permission) -> PermissionSet:
    "Transform a permission from DB to API representation."
    return PermissionSet(read=permission.read, write=permission.write)
