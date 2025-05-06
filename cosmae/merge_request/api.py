"API methods for merge requests."

from datetime import datetime
from typing import List

from django.db import DatabaseError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.models_api import ColumnResponse
from cosmae.column.models_conversion import column_db_to_api
from cosmae.column.models_django import Column as ColumnDb
from cosmae.entity.api import Entity, entity_db_dict_to_api
from cosmae.exception import ApiError, ForbiddenException, NotAuthenticatedException
from cosmae.merge_request.entity.api import (
    REPLACEMENT_STATE_API_TO_DB_MAP,
    REPLACEMENT_STATE_DB_TO_API_MAP,
    Value,
    merge_request_step_db_to_api_map,
)
from cosmae.merge_request.models_django import ColumnMergeRequest as MergeRequestDb
from cosmae.merge_request.models_django import TagConflictResolution
from cosmae.merge_request.queue import dispatch_resolve_conflicts
from cosmae.user.model_conversion.public import user_db_to_public_user_info
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util.auth import check_user
from cosmae.value.models_django import Value as ValueDb

router = Router()


class MergeRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API Model for a single merge request"
    id_persistent: str
    created_by: PublicUserInfo
    destination: ColumnResponse
    origin: ColumnResponse
    created_at: datetime
    assigned_to: PublicUserInfo | None = None
    state: str
    disable_origin_on_merge: bool


class MergeRequestConflict(Schema):
    # pylint: disable=too-few-public-methods
    "API model for merge request conflicts."
    entity: Entity
    value_origin: Value
    value_destination: Value | None = None
    replacement_state: str | None = None
    replacement_value: str | None = None


class MergeRequestConflictResponse(Schema):
    # pylint: disable=too-few-public-methods
    "API model for multiple merge requests conflicts"
    conflicts: List[MergeRequestConflict]
    updated: List[MergeRequestConflict]
    merge_request: MergeRequest


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
        by_user = MergeRequestDb.created_by_user(user)
        assigned_to_user = MergeRequestDb.assigned_to_user(user)
        return 200, MergeRequestResponseList(
            created=[merge_request_db_to_api(mr) for mr in by_user],
            assigned=[merge_request_db_to_api(mr) for mr in assigned_to_user],
        )
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except ForbiddenException:
        return 403, ApiError(msg="Insufficient permissions")
    except DatabaseError:
        return 500, ApiError(msg="Could not get the merge requests from the database.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get the requested merge requests.")


@router.patch(
    "/{id_merge_request_persistent}",
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
def get_merge_request_conflicts(request: HttpRequest, id_merge_request_persistent):
    "API method for getting merge request conflicts."
    try:
        user = check_user(request)
        merge_request = MergeRequestDb.by_id_persistent(
            id_merge_request_persistent, user
        )
        resolutions = TagConflictResolution.for_merge_request_query_set(merge_request)
        recent = TagConflictResolution.only_recent(resolutions)
        updated_query_set = TagConflictResolution.non_recent(resolutions)
        conflict_query_set = ValueDb.annotate_entity(
            merge_request.instance_conflicts_all(True, recent)
        )
        return 200, MergeRequestConflictResponse(
            conflicts=[
                annotated_tag_instance_db_to_api(conflict)
                for conflict in conflict_query_set
            ],
            updated=[
                conflict_with_updated_data_db_to_api(updated)
                for updated in updated_query_set
            ],
            merge_request=merge_request_db_to_api(merge_request),
        )
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge request does not exist.")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except ForbiddenException:
        return 403, ApiError(msg="Insufficient permissions")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not get the merge request conflicts from the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get the requested merge request conflicts.")


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
        TagConflictResolution.objects.filter(  # pylint: disable=no-member
            entity__id_persistent=resolution_info.id_entity_persistent,
            column_origin__id_persistent=(resolution_info.id_column_origin_persistent),
            value_origin__id_persistent=resolution_info.id_value_origin_persistent,
            column_destination__id_persistent=(
                resolution_info.id_column_destination_persistent
            ),
            merge_request=merge_request,
        ).delete()
        resolution = TagConflictResolution(
            entity_id=resolution_info.id_entity_version,
            column_origin_id=resolution_info.id_column_origin_version,
            value_origin_id=resolution_info.id_value_origin_version,
            column_destination_id=resolution_info.id_column_destination_version,
            value_destination_id=resolution_info.id_value_destination_version,
            merge_request=merge_request,
            replacement_state=REPLACEMENT_STATE_API_TO_DB_MAP.get(
                resolution_info.replacement_state
            ),
            replacement_value=resolution_info.replacement_value,
        )
        resolution.save()
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
                MergeRequestDb.by_id_persistent_query_set(id_merge_request_persistent)
                .select_for_update()
                .get()
            )
            if not (merge_request.state == MergeRequestDb.OPEN or MergeRequestDb.ERROR):
                return 400, ApiError(msg="Merge request not available for merging.")
            tag_definition_destination = ColumnDb.most_recent_by_id(
                merge_request.id_destination_persistent
            )
            if not tag_definition_destination.has_write_access(user.id_persistent):
                return 403, ApiError(
                    msg="You do not have write permissions for the destination tag."
                )
            resolutions = TagConflictResolution.for_merge_request_query_set(
                merge_request
            )
            updated = TagConflictResolution.non_recent(resolutions)
            if len(updated) > 0:
                return 400, ApiError(
                    msg="There are conflicts for the merge request, "
                    "where the underlying data has changed."
                )
            conflicts = merge_request.instance_conflicts_all(
                include_resolved=False, resolution_values=resolutions
            )
            if len(conflicts) > 0:
                return 400, ApiError(
                    msg="There are unresolved conflicts for the merge request."
                )
            merge_request.state = MergeRequestDb.RESOLVED
            merge_request.save(update_fields=["state"])
            dispatch_resolve_conflicts(merge_request, user)
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge Request does not exist.")
    except ColumnDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Destination tag definition does not exist.")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not mark the merge request for merging in the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not mark the merge request for merging.")


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


def annotated_tag_instance_db_to_api(annotated_instance):
    "Converts an annotated tag instance from DB to API representation"
    entity = annotated_instance.entity
    tag_instance_destination_db = annotated_instance.value_destination
    if tag_instance_destination_db is None:
        tag_instance_destination = None
    else:
        tag_instance_destination = Value(
            id_persistent=tag_instance_destination_db["id_persistent"],
            version=tag_instance_destination_db["id"],
            value=tag_instance_destination_db["value"],
        )
    return MergeRequestConflict(
        entity=entity_db_dict_to_api(entity),
        value_origin=Value(
            id_persistent=annotated_instance.id_persistent,
            version=annotated_instance.id,
            value=annotated_instance.value,
        ),
        value_destination=tag_instance_destination,
        replacement_state=REPLACEMENT_STATE_DB_TO_API_MAP.get(
            annotated_instance.conflict_resolution_replacement_state
        ),
        replacement_value=annotated_instance.conflict_resolution_replacement_value,
    )


def conflict_with_updated_data_db_to_api(annotated_conflict):
    "Transform an annotated conflict from DB to API representation."
    entity = annotated_conflict.entity_most_recent
    tag_instance_destination_db = annotated_conflict.value_destination_most_recent
    if tag_instance_destination_db is None:
        tag_instance_destination = None
    else:
        tag_instance_destination = Value(
            id_persistent=tag_instance_destination_db["id_persistent"],
            version=tag_instance_destination_db["id"],
            value=tag_instance_destination_db["value"],
        )

    tag_instance_origin = annotated_conflict.value_origin_most_recent
    return MergeRequestConflict(
        entity=entity_db_dict_to_api(entity),
        value_origin=Value(
            id_persistent=tag_instance_origin["id_persistent"],
            version=tag_instance_origin["id"],
            value=tag_instance_origin["value"],
        ),
        value_destination=tag_instance_destination,
        # Underlying data has changed!
        replacement_state=None,
        replacement_value=annotated_conflict.replacement_value,
    )
