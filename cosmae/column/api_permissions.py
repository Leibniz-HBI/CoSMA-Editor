"API methods for changing column permissions."

from logging import getLogger
from typing import List, Union
from uuid import uuid4

from django.db import transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.models_api import ColumnResponse
from cosmae.column.models_conversion import (
    column_db_dict_to_api,
    column_db_to_api,
)
from cosmae.column.models_django import Column as ColumnDb
from cosmae.column.models_django import OwnershipRequest as OwnershipRequestDb
from cosmae.exception import ApiError, NotAuthenticatedException, PermissionException
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.user.model_conversion.public import user_db_to_public_user_info
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user

router = Router()
logger = getLogger(__name__)


class OwnershipRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for ownership requests."
    petitioner: PublicUserInfo
    receiver: PublicUserInfo
    column: ColumnResponse
    id_persistent: str


class OwnerShipRequestList(Schema):
    # pylint: disable=too-few-public-methods
    "API model for response containing ownership requests."
    received: List[OwnershipRequest]
    petitioned: List[OwnershipRequest]


@router.post(
    "/{id_column_persistent}/curate",
    response={
        200: ColumnResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_curation(request: HttpRequest, id_column_persistent):
    "API method for setting a column as curated."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        if user.permission_group not in {CosmaeUser.COMMISSIONER, CosmaeUser.EDITOR}:
            return 403, ApiError(msg="Insufficient permissions")
        with transaction.atomic():
            column = ColumnDb.most_recent_by_id(id_column_persistent)
            time_edit = timestamp()
            column, do_write = column.set_curated(user, time_edit)
            if do_write:
                column.save()
            OwnershipRequestDb.by_id_column_persistent_query_set(
                id_column_persistent
            ).delete()
            ColumnMergeRequest.change_owner_for_column(column.id_persistent, None)
        return 200, column_db_to_api(column)
    except ColumnDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Column does not exist.")
    except PermissionException:
        return 403, ApiError(msg="Insufficient permissions.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not change curation status of column")


@router.post(
    "{id_column_persistent}/owner/{id_user_persistent}",
    response={
        200: Union[ColumnResponse, None],
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_ownership_request(  # pylint:: disable=too-many-return-statements
    request: HttpRequest, id_column_persistent: str, id_user_persistent: str
):
    "API method for creating an ownership request."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    column = ColumnDb.most_recent_by_id(id_column_persistent)
    if not (
        column.owner == user
        or (
            column.owner is None
            and user.permission_group in {CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER}
        )
    ):
        return 403, ApiError(msg="You do not own the column.")
    if column.owner is not None and id_user_persistent == str(
        column.owner.id_persistent
    ):
        return 400, ApiError(msg="You already own that column.")
    try:
        with transaction.atomic():
            OwnershipRequestDb.by_id_column_persistent_query_set(
                id_column_persistent
            ).delete()
            if str(user.id_persistent) == id_user_persistent:
                time_edit = timestamp()
                column_new, do_save = column.set_owner(user, user, time_edit)
                if do_save:
                    with transaction.atomic():
                        column_new.save()
                        ColumnMergeRequest.change_owner_for_column(
                            id_column_persistent, user
                        )
                return 200, column_db_to_api(column_new)
            receiver = CosmaeUser.objects.filter(id_persistent=id_user_persistent).get()
            OwnershipRequestDb.objects.create(  # pylint: disable = no-member
                id_column_persistent=id_column_persistent,
                receiver=receiver,
                petitioner=user,
                id_persistent=uuid4(),
            )
        return 200, None
    except CosmaeUser.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="User Does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not create ownership request")


@router.post(
    "owner/{id_ownership_request_persistent}/accept",
    response={
        200: ColumnResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_accept_ownership_request(
    request: HttpRequest, id_ownership_request_persistent
):
    "API method for accepting an ownership request."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authorized.")
    try:
        ownership_request = OwnershipRequestDb.by_id_persistent(
            id_ownership_request_persistent
        )
        if ownership_request.receiver != user:
            return 403, ApiError(
                msg="You are not the recipient of the ownership request."
            )
        time_edit = timestamp()
        column = ColumnDb.most_recent_by_id(ownership_request.id_column_persistent)
        column_new, do_save = column.set_owner(
            user, ownership_request.petitioner, time_edit
        )
        if do_save:
            with transaction.atomic():
                column_new.save()
                ColumnMergeRequest.change_owner_for_column(
                    column_new.id_persistent, ownership_request.receiver
                )
                ownership_request.delete()
        return 200, column_db_to_api(column_new)

    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not accept ownership request")


@router.delete(
    "owner/{id_ownership_request_persistent}",
    response={
        200: None,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def delete_ownership_request(request: HttpRequest, id_ownership_request_persistent):
    "API method for deleting an ownership request."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authorized.")
    try:
        ownership_request = OwnershipRequestDb.by_id_persistent(
            id_ownership_request_persistent
        )
        if ownership_request.petitioner != user:
            is_owner = False
            if user.permission_group in {CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER}:
                column = ColumnDb.most_recent_by_id(
                    ownership_request.id_column_persistent
                )
                is_owner = column.curated
            if not is_owner:
                return 403, ApiError(
                    msg="You are not the petitioner of the ownership request."
                )
        ownership_request.delete()
        return 200, None

    except ColumnDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Column does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not delete ownership request")


@router.get(
    "ownership_requests",
    response={
        200: OwnerShipRequestList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_ownership_requests(request: HttpRequest):
    "API method for retrieving ownership requests of a user."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")

    try:
        received_db = OwnershipRequestDb.received_by_user_query_set(user)
        petitioned_db = OwnershipRequestDb.petitioned_by_user_query_set(user)

        return 200, OwnerShipRequestList(
            received=[
                ownership_request_db_to_api(req)
                for req in received_db
                if req.column is not None
            ],
            petitioned=[
                ownership_request_db_to_api(req)
                for req in petitioned_db
                if req.column is not None
            ],
        )
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Error retrieving ownership requests.", exc_info=exc)
        return 500, ApiError(msg="Could not create ownership request")


def ownership_request_db_to_api(ownership_request: OwnershipRequestDb):
    "Transforms a ownership request from database to API model."
    return OwnershipRequest(
        petitioner=user_db_to_public_user_info(ownership_request.petitioner),
        receiver=user_db_to_public_user_info(ownership_request.receiver),
        column=column_db_dict_to_api(ownership_request.column),
        id_persistent=str(ownership_request.id_persistent),
    )
