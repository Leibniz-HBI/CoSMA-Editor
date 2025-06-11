"API methods for managing SSh keys"

from typing import List
from uuid import uuid4

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
        uuid = str(uuid4())
        key_verified = check_key(key.key)
        if len(key_verified) == 1:
            return 400, ApiError(msg=key_verified[0])
        key_type, key_string, name = key_verified
        key_db = SshKeyDb.objects.create(
            id_persistent=uuid,
            key=key_string,
            name=name,
            type=key_type,
            user=user_target,
        )
        return 200, ssh_key_db_to_api_with_id(key_db)
    except CosmaeUser.DoesNotExist:
        return 404, ApiError(msg="User does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not add SSH key.")


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


def check_key(key: str):
    """Check a user provided key.
    Returns an array.
    If the length is one, then it contains an error message.
    If the length is three, then it contains the type, the key and the name."""
    split = key.split(" ")
    if len(split) != 3:
        return [
            "Could not parse key. It must consist of three parts, separated by spaces."
        ]
    key_type, key_string, name = split
    for c in key_type:
        if not (c.islower() or c.isdigit() or c == "-"):
            return ["Key type can only contain lower case, numbers or dashes."]
    for c in key_string:
        if not (c.isalnum() or c in {"+", "/", "="}):
            return ["The key has to be base64 encoded"]
    for c in name:
        if not (c.isalnum() or c in {"@", "+", "-", "_", "."}):
            return [f'The character "{c}" is not allowed in key names.']
    return split


def ssh_key_db_to_api_with_id(key_db: SshKeyDb) -> SshKeyMetaData:
    "Convert an SSH key from API to DB representation with Id"
    return SshKeyMetaData(
        name=key_db.name,
        type=key_db.type,
        id_persistent=key_db.id_persistent,
    )
