"API methods for merge requests."
from datetime import datetime
from typing import List, Optional

from django.db import DatabaseError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import ApiError, ForbiddenException, NotAuthenticatedException
from cosmae.merge_request.entity.api import TagInstance, merge_request_step_db_to_api_map
from cosmae.merge_request.models_django import TagConflictResolution
from cosmae.merge_request.models_django import TagMergeRequest as MergeRequestDb
from cosmae.person.api import PersonNatural
from cosmae.tag.api.definitions import tag_definition_db_to_api
from cosmae.tag.api.models_api import TagDefinitionResponse
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.tag.models_django import TagInstance as TagInstanceDb
from cosmae.user.api import user_db_to_public_user_info
from cosmae.user.models_api import PublicUserInfo
from cosmae.util.auth import check_user

router = Router()


class MergeRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API Model for a single merge request"
    id_persistent: str
    created_by: PublicUserInfo
    destination: TagDefinitionResponse
    origin: TagDefinitionResponse
    created_at: datetime
    assigned_to: Optional[PublicUserInfo]
    state: str


class MergeRequestConflict(Schema):
    # pylint: disable=too-few-public-methods
    "API model for merge request conflicts."
    entity: PersonNatural
    tag_instance_origin: TagInstance
    tag_instance_destination: Optional[TagInstance]
    replace: Optional[bool]


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
    id_tag_definition_origin_version: int
    id_tag_instance_origin_version: int
    id_tag_definition_destination_version: int
    id_tag_instance_destination_version: Optional[int]
    id_entity_persistent: str
    id_tag_definition_origin_persistent: str
    id_tag_instance_origin_persistent: str
    id_tag_definition_destination_persistent: str
    id_tag_instance_destination_persistent: Optional[str]
    replace: bool


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
        conflict_query_set = TagInstanceDb.annotate_entity(
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
        TagConflictResolution.objects.filter(  # pylint: disable=no-member
            entity__id_persistent=resolution_info.id_entity_persistent,
            tag_definition_origin__id_persistent=(
                resolution_info.id_tag_definition_origin_persistent
            ),
            tag_instance_origin__id_persistent=resolution_info.id_tag_instance_origin_persistent,
            tag_definition_destination__id_persistent=(
                resolution_info.id_tag_definition_destination_persistent
            ),
            merge_request=merge_request,
        ).delete()
        resolution = TagConflictResolution(
            entity_id=resolution_info.id_entity_version,
            tag_definition_origin_id=resolution_info.id_tag_definition_origin_version,
            tag_instance_origin_id=resolution_info.id_tag_instance_origin_version,
            tag_definition_destination_id=resolution_info.id_tag_definition_destination_version,
            tag_instance_destination_id=resolution_info.id_tag_instance_destination_version,
            merge_request=merge_request,
            replace=resolution_info.replace,
        )
        resolution.save()
        return 200, None
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge request does not exists.")
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
            tag_definition_destination = TagDefinitionDb.most_recent_by_id(
                merge_request.id_destination_persistent
            )
            if not tag_definition_destination.has_write_access(user):
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
        return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except MergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge Request does not exist.")
    except TagDefinitionDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Destination tag definition does not exist.")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not mark the merge request for merging in the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not mark the merge request for merging.")


def merge_request_db_to_api(mr_db: MergeRequestDb) -> MergeRequest:
    "Transform a merge request form DB to API representation"
    destination = TagDefinitionDb.most_recent_by_id(mr_db.id_destination_persistent)
    origin = TagDefinitionDb.most_recent_by_id(mr_db.id_origin_persistent)
    return MergeRequest(
        id_persistent=str(mr_db.id_persistent),
        created_by=user_db_to_public_user_info(mr_db.created_by),
        destination=tag_definition_db_to_api(destination),
        origin=tag_definition_db_to_api(origin),
        created_at=mr_db.created_at,
        assigned_to=user_db_to_public_user_info(mr_db.assigned_to),
        state=merge_request_step_db_to_api_map[mr_db.state],
    )


def annotated_tag_instance_db_to_api(annotated_instance):
    "Converts an annotated tag instance from DB to API representation"
    entity = annotated_instance.entity
    tag_instance_destination_db = annotated_instance.tag_instance_destination
    if tag_instance_destination_db is None:
        tag_instance_destination = None
    else:
        tag_instance_destination = TagInstance(
            id_persistent=tag_instance_destination_db["id_persistent"],
            version=tag_instance_destination_db["id"],
            value=tag_instance_destination_db["value"],
        )
    return MergeRequestConflict(
        entity=PersonNatural(
            display_txt=entity["display_txt"],
            id_persistent=entity["id_persistent"],
            version=entity["id"],
            disabled=entity["disabled"],
        ),
        tag_instance_origin=TagInstance(
            id_persistent=annotated_instance.id_persistent,
            version=annotated_instance.id,
            value=annotated_instance.value,
        ),
        tag_instance_destination=tag_instance_destination,
        replace=annotated_instance.conflict_resolution_replace,
    )


def conflict_with_updated_data_db_to_api(annotated_conflict):
    "Transform an annotated conflict from DB to API representation."
    entity = annotated_conflict.entity_most_recent
    tag_instance_destination_db = (
        annotated_conflict.tag_instance_destination_most_recent
    )
    if tag_instance_destination_db is None:
        tag_instance_destination = None
    else:
        tag_instance_destination = TagInstance(
            id_persistent=tag_instance_destination_db["id_persistent"],
            version=tag_instance_destination_db["id"],
            value=tag_instance_destination_db["value"],
        )

    tag_instance_origin = annotated_conflict.tag_instance_origin_most_recent
    return MergeRequestConflict(
        entity=PersonNatural(
            display_txt=entity["display_txt"],
            version=entity["id"],
            id_persistent=entity["id_persistent"],
            disabled=entity["disabled"],
        ),
        tag_instance_origin=TagInstance(
            id_persistent=tag_instance_origin["id_persistent"],
            version=tag_instance_origin["id"],
            value=tag_instance_origin["value"],
        ),
        tag_instance_destination=tag_instance_destination,
        # Underlying data has changed!
        replace=None,
    )
