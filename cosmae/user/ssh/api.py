"API methods for managing SSh keys"

from typing import List

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.user.ssh.models_django import SshKey as SshKeyDb
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user

router = Router()


class SshKey(Schema):
    "Models an SSH key for API methods"

    key: str


class SshKeyPutRequest(SshKey):
    "Model for adding a SSH key."

    id_user_persistent: str | None = None


class SshKeyMetaData(Schema):
    "An SSH key that is created in the DB"

    id_persistent: str
    name: str
    type: str


class SshKeyList(Schema):
    "Multiple SSH key API response"

    key_list: List[SshKeyMetaData]


@router.put(
    "",
    response={
        200: SshKeyMetaData,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def put_ssh_key(request: HttpRequest, key: SshKeyPutRequest):
    "Add an SSH key"
    try:
        user_request = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        if key.id_user_persistent is not None:
            if user_request.permission_group != CosmaeUser.COMMISSIONER:
                return 403, ApiError(msg="Insufficient permissions")
            user_target = CosmaeUser.objects.filter(
                id_persistent=key.id_user_persistent
            ).get()
        else:
            user_target = user_request
        key_db = SshKeyDb.add_key(user_target, key.key)
        return 200, ssh_key_db_to_api_with_id(key_db)
    except SshKeyDb.InvalidSshKeyException as exc:
        status = 400
        msg = exc.msg
    except SshKeyDb.SshNotEnabledException:
        status = 400
        msg = "SSH is not configured. Therefore you do not need to add an SSH key."
    except CosmaeUser.DoesNotExist:
        status = 404
        msg = "User does not exist."
    except Exception:  # pylint: disable=broad-except
        status = 500
        msg = "Could not add SSH key."
    return status, ApiError(msg=msg)


@router.get("", response={200: SshKeyList, 401: ApiError, 403: ApiError, 500: ApiError})
def get_key_list(request: HttpRequest):
    "Get all ssh keys of the requesting user."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        key_queryset = SshKeyDb.objects.filter(user=user)
        return 200, SshKeyList(
            key_list=[ssh_key_db_to_api_with_id(key) for key in key_queryset]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get SSh keys.")


@router.delete(
    "/key/{id_key_persistent}",
    response={200: None, 401: ApiError, 400: ApiError, 404: ApiError, 500: ApiError},
)
def delete_key(request: HttpRequest, id_key_persistent: str):
    "Delete a SSH key API method"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        key_queryset = SshKeyDb.objects.filter(user=user)
        if len(key_queryset) == 1:
            key = key_queryset.get()
            if key.id_persistent == id_key_persistent:
                return 400, ApiError(msg="Can not delete last remaining key.")
        SshKeyDb.objects.filter(id_persistent=id_key_persistent, user=user).delete()
        return 200, None
    except SshKey.DoesNotExist:
        return 404, ApiError(msg="Key not found.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not delete key.")


def ssh_key_db_to_api_with_id(key_db: SshKeyDb) -> SshKeyMetaData:
    "Convert an SSH key from API to DB representation with Id"
    return SshKeyMetaData(
        name=key_db.name,
        type=key_db.type,
        id_persistent=key_db.id_persistent,
    )
