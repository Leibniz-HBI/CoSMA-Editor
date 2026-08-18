"API methods for merge requests."

from datetime import datetime
from logging import getLogger
from typing import List, Literal

from django.db import DatabaseError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.models_api import ColumnResponse
from cosmae.column.models_conversion import column_db_to_api
from cosmae.column.models_django import Column as ColumnDb
from cosmae.entity.api import (
    EntityRequest,
    entity_db_dict_to_api,
    entity_db_to_entity_request_api,
)
from cosmae.exception import ApiError, ForbiddenException, NotAuthenticatedException
from cosmae.merge_request.entity.api import (
    REPLACEMENT_STATE_API_TO_DB_MAP,
    REPLACEMENT_STATE_DB_TO_API_MAP,
    Value,
    merge_request_step_db_to_api_map,
)
from cosmae.merge_request.models_django import ColumnConflictResolution
from cosmae.merge_request.models_django import ColumnMergeRequest as MergeRequestDb
from cosmae.user.model_conversion.public import user_db_to_public_user_info
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util.auth import check_user

router = Router()
_LOGGER = getLogger(__name__)


class MergeRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API Model for a single merge request"
    id_persistent: str
    created_by: PublicUserInfo
    destination: ColumnResponse
    origin: ColumnResponse
    created_at: datetime
    assigned_to: PublicUserInfo | None = None
    state: Literal[
        "CREATED", "OPEN", "CONFLICTS", "CLOSED", "RESOLVED", "MERGED", "ERROR"
    ]
    disable_origin_on_merge: bool


class MergeRequestConflict(Schema):
    # pylint: disable=too-few-public-methods
    "API model for merge request conflicts."
    entity: EntityRequest
    value_origin: Value
    value_destination: Value | None = None
    replacement_state: str | None = None
    replacement_value: str | None = None


class MergeRequestConflictResponse(Schema):
    # pylint: disable=too-few-public-methods
    "API model for multiple merge requests conflicts"
    conflicts: List[MergeRequestConflict]
    updated_conflicts: List[MergeRequestConflict]
    next_offset: int


class MergeRequestResponseList(Schema):
    # pylint: disable=too-few-public-methods
    "Response schema for all merge requests of a user."
    created: List[MergeRequest]
    assigned: List[MergeRequest]


class ConflictResolutionPostRequest(Schema):
    "Body for requests that resolve merge request conflicts"

    # pylint: disable=too-few-public-methods
    id_entity_version: int
    id_column_origin_version: int
    id_value_origin_version: int
    id_column_destination_version: int
    id_value_destination_version: int | None = None
    id_entity_persistent: str
    id_column_origin_persistent: str
    id_value_origin_persistent: str
    id_column_destination_persistent: str
    id_value_destination_persistent: str | None = None
    replacement_value: str | None = None
    replacement_state: str | None = None


class PatchMergeRequestRequest(Schema):
    "Body for changing a merge request"

    # pylint: disable=too-few-public-methods
    disable_origin_on_merge: bool | None = None


@router.get(
    "",
    response={
        200: MergeRequestResponseList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_merge_requests(request: HttpRequest):
    "API method for retrieving merge requests."
    try:
        user = check_user(request)
        by_user = MergeRequestDb.objects.created_by_user(user)
        assigned_to_user = MergeRequestDb.objects.assigned_to_user(user)
        return 200, MergeRequestResponseList(
            created=[merge_request_db_to_api(mr) for mr in by_user],
            assigned=[merge_request_db_to_api(mr) for mr in assigned_to_user],
        )
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except ForbiddenException:
        return 403, ApiError(msg="Insufficient permissions")
    except DatabaseError as exc:
        msg = "Could not get the merge requests from the database."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Could not get the requested merge requests."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


@router.patch(
    "{id_merge_request_persistent}",
    response={
        200: MergeRequest,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def patch_merge_request(
    request: HttpRequest,
    id_merge_request_persistent,
    patch_data: PatchMergeRequestRequest,
):
    "Change a merge request"
    try:
        user = check_user(request)
        merge_request = MergeRequestDb.by_id_persistent(
            id_merge_request_persistent, user
        )
        if patch_data.disable_origin_on_merge is not None:
            merge_request.disable_origin_on_merge = patch_data.disable_origin_on_merge
        merge_request.save()
        return 200, merge_request_db_to_api(merge_request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge Request does not exist")
    except ForbiddenException:
        return 403, ApiError(msg="Insufficient permissions.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not patch merge request.")


@router.get(
    "{id_merge_request_persistent}",
    response={200: MergeRequest, 401: ApiError, 404: ApiError, 500: ApiError},
)
def get_merge_request(request: HttpRequest, id_merge_request_persistent: str):
    "API method for retrieving a single merge request."
    try:
        user = check_user(request)
        merge_request = MergeRequestDb.by_id_persistent(
            id_merge_request_persistent, user
        )
        return 200, merge_request_db_to_api(merge_request)
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge request does not exist.")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Could not get the requested merge request."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


@router.get(
    "/{id_merge_request_persistent}/conflicts",
    response={
        200: MergeRequestConflictResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_merge_request_conflicts(
    request: HttpRequest, id_merge_request_persistent: str, offset: int, limit: int
):
    "API method for getting merge request conflicts."
    try:
        user = check_user(request)
        resolution_query_set, updated_query_set = resolutions_updated_querysets(
            id_merge_request_persistent, offset, user
        )
        conflicts_response = []
        max_offset = -2
        for conflict in resolution_query_set[:limit]:
            conflicts_response.append(annotated_value_db_to_api(conflict))
            max_offset = max(max_offset, conflict.id)
        updated_query_set = updated_query_set.filter(id__lte=max_offset)
        return 200, MergeRequestConflictResponse(
            conflicts=conflicts_response,
            updated_conflicts=[
                updated_conflict_db_to_api(conflict) for conflict in updated_query_set
            ],
            next_offset=max_offset + 1,
        )
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge request does not exist.")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except ForbiddenException:
        return 403, ApiError(msg="Insufficient permissions")
    except DatabaseError as exc:
        msg = "Could not get the merge request conflicts from the database."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Could not get the requested merge request conflicts."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


def resolutions_updated_querysets(id_merge_request_persistent, offset, user):
    "Compute the conflicts for a merge request and the ones were updates happened."
    merge_request = MergeRequestDb.by_id_persistent(id_merge_request_persistent, user)
    resolutions = (
        ColumnConflictResolution.for_merge_request_query_set(merge_request)
        .filter(id__gte=offset)
        .order_by("id")
    ).prefetch_related()
    updated_query_set = resolutions.non_recent()
    return resolutions, updated_query_set


@router.post(
    "/{id_merge_request_persistent}/resolve",
    response={
        200: None,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_resolve_conflict(
    request: HttpRequest,
    id_merge_request_persistent: str,
    resolution_info: ConflictResolutionPostRequest,
):
    "API method for resolving merge conflicts."
    try:
        user = check_user(request)
        merge_request = MergeRequestDb.by_id_persistent(
            id_merge_request_persistent, user
        )
        status = None
        return_value = None
        merge_request.resolve(
            id_entity_persistent=resolution_info.id_entity_persistent,
            id_column_origin_persistent=resolution_info.id_column_origin_persistent,
            id_value_origin_persistent=resolution_info.id_value_origin_persistent,
            id_column_destination_persistent=resolution_info.id_column_destination_persistent,
            id_entity_version=resolution_info.id_entity_version,
            id_column_origin_version=resolution_info.id_column_origin_version,
            id_value_origin_version=resolution_info.id_value_origin_version,
            id_column_destination_version=resolution_info.id_column_destination_version,
            id_value_destination_version=resolution_info.id_value_destination_version,
            replacement_value=resolution_info.replacement_value,
            replacement_state=REPLACEMENT_STATE_API_TO_DB_MAP.get(
                resolution_info.replacement_state
            ),
        )
        status, return_value = 200, None
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        status, return_value = 404, ApiError(msg="Merge request does not exists.")
    except NotAuthenticatedException:
        status, return_value = 401, ApiError(msg="Not authenticated.")
    except ForbiddenException:
        status, return_value = 403, ApiError(msg="Insufficient permissions")
    except KeyError:
        status, return_value = 400, ApiError(
            msg="Invalid method for conflict resolution"
        )
    except DatabaseError:
        status, return_value = 500, ApiError(
            msg="Could not get the merge request conflicts from the database."
        )
    except Exception:  # pylint: disable=broad-except
        status, return_value = 500, ApiError(
            msg="Could not resolve the merge request conflict."
        )
    return status, return_value


@router.post(
    "/{id_merge_request_persistent}/merge",
    response={
        200: None,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_merge_request_merge(  # pylint: disable=too-many-return-statements
    request: HttpRequest, id_merge_request_persistent: str
):
    "API method for marking a merge request for merging."
    try:
        with transaction.atomic():
            user = check_user(request)
            merge_request = (
                MergeRequestDb.objects.by_id_persistent(id_merge_request_persistent)
                .select_for_update()
                .get()
            )
            if not (
                merge_request.state == MergeRequestDb.State.OPEN
                or MergeRequestDb.State.ERROR
            ):
                return 400, ApiError(msg="Merge request not available for merging.")
            column_destination = ColumnDb.most_recent_by_id(
                merge_request.id_destination_persistent
            )
            if not column_destination.has_write_access(user.id_persistent):
                return 403, ApiError(
                    msg="You do not have write permissions for the destination column."
                )
            merge_request.state = MergeRequestDb.State.CONFLICTS
            merge_request.approved_by_session = user.edit_session
            merge_request.save(update_fields=["state", "approved_by_session"])
            merge_request.approved_by_session = user.edit_session
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge Request does not exist.")
    except ColumnDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Destination column does not exist.")
    except DatabaseError as exc:
        msg = "Could not mark the merge request for merging in the database."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Could not mark the merge request for merging."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


def merge_request_db_to_api(mr_db: MergeRequestDb) -> MergeRequest:
    "Transform a merge request form DB to API representation"
    destination = ColumnDb.most_recent_by_id(mr_db.id_destination_persistent)
    origin = ColumnDb.most_recent_by_id(mr_db.id_origin_persistent)
    return MergeRequest(
        id_persistent=str(mr_db.id_persistent),
        created_by=user_db_to_public_user_info(mr_db.created_by),
        destination=column_db_to_api(destination),
        origin=column_db_to_api(origin),
        created_at=mr_db.created_at,
        assigned_to=user_db_to_public_user_info(mr_db.assigned_to),
        state=merge_request_step_db_to_api_map[mr_db.state],
        disable_origin_on_merge=mr_db.disable_origin_on_merge,
    )


def annotated_value_db_to_api(conflict):
    "Converts an annotated value from DB to API representation"
    entity = conflict.entity
    value_destination = conflict.value_destination
    if value_destination is None:
        value_destination = None
    else:
        value_destination = Value(
            id_persistent=value_destination.id_persistent,
            version=value_destination.id,
            value=value_destination.value,
        )
    return MergeRequestConflict(
        entity=entity_db_to_entity_request_api(entity),
        value_origin=Value(
            id_persistent=conflict.value_origin.id_persistent,
            version=conflict.value_origin.id,
            value=conflict.value_origin.value,
        ),
        value_destination=value_destination,
        replacement_state=REPLACEMENT_STATE_DB_TO_API_MAP.get(
            conflict.replacement_state
        ),
        replacement_value=conflict.replacement_value,
    )


def conflict_with_updated_data_db_to_api(annotated_conflict):
    "Transform an annotated conflict from DB to API representation."
    entity = annotated_conflict.entity_most_recent
    value_destination_db = annotated_conflict.value_destination_most_recent
    if value_destination_db is None:
        value_destination = None
    else:
        value_destination = Value(
            id_persistent=value_destination_db["id_persistent"],
            version=value_destination_db["id"],
            value=value_destination_db["value"],
        )

    value_origin = annotated_conflict.value_origin_most_recent
    return MergeRequestConflict(
        entity=entity_db_dict_to_api(entity),
        value_origin=Value(
            id_persistent=value_origin["id_persistent"],
            version=value_origin["id"],
            value=value_origin["value"],
        ),
        value_destination=value_destination,
        # Underlying data has changed!
        replacement_state=None,
        replacement_value=annotated_conflict.replacement_value,
    )


def conflict_value_db_to_api(value_db):
    "Transform a value from DB to API representation."
    if value_db is None:
        return None
    return Value(
        id_persistent=value_db["id_persistent"],
        version=value_db["id"],
        value=value_db["value"],
    )


def updated_conflict_db_to_api(annotated_conflict):
    "Transform an updated conflict from DB to API representation."

    return MergeRequestConflict(
        entity=entity_db_dict_to_api(annotated_conflict.entity_most_recent),
        value_origin=conflict_value_db_to_api(
            annotated_conflict.value_origin_most_recent
        ),
        value_destination=conflict_value_db_to_api(
            annotated_conflict.value_destination_most_recent
        ),
        replacement_state=None,
        replacement_value=annotated_conflict.replacement_value,
    )
