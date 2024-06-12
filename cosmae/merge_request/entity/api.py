"API methods for entity merge requests"

from typing import List
from uuid import uuid4

from django.db import DatabaseError, transaction
from django.http import HttpRequest
from django_rq import enqueue
from ninja import Router, Schema

from cosmae.entity.models_django import Entity as EntityDb
from cosmae.entity.models_django import EntityJustification
from cosmae.exception import ApiError, ForbiddenException, NotAuthenticatedException
from cosmae.merge_request.entity.models_django import (
    EntityConflictResolution as EntityConflictResolutionDb,
)
from cosmae.merge_request.entity.models_django import (
    EntityMergeRequest as EntityMergeRequestDb,
)
from cosmae.merge_request.entity.queue import apply_entity_merge_request
from cosmae.person.api import PersonNatural, person_db_to_api
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.tag.queue import get_tag_definition_name_path_from_parts
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.user.models_conversion import user_db_to_public_user_info
from cosmae.util import CosmaeUser as CosmaeUserDb
from cosmae.util import timestamp
from cosmae.util.auth import check_user

router = Router()


class TagDefinition(Schema):
    "A stripped down view on tag definitions"

    # pylint: disable=too-few-public-methods
    name_path: List[str]
    id_persistent: str
    id_parent_persistent: str | None = None
    version: int
    curated: bool


class TagInstance(Schema):
    "Stripped down view on tag instances."

    # pylint: disable=too-few-public-methods
    id_persistent: str
    value: str
    version: int


class EntityMergeRequest(Schema):
    "API model for entity merge requests"

    # pylint: disable=too-few-public-methods
    id_persistent: str
    origin: PersonNatural
    destination: PersonNatural
    created_by: PublicUserInfo
    state: str


class EntityMergeRequestList(Schema):
    "API model for multiple entity merge requests"

    # pylint: disable=too-few-public-methods
    entity_merge_requests: List[EntityMergeRequest]


class EntityMergeRequestConflict(Schema):
    "API model for entity merge request conflicts."

    # pylint: disable=too-few-public-methods
    tag_definition: TagDefinition
    tag_instance_origin: TagInstance
    tag_instance_destination: TagInstance | None = None
    replace: bool | None = None


class GetEntityMergeRequestConflictsResponse(Schema):
    "Response for get entity merge request requests."

    # pylint: disable=too-few-public-methods
    merge_request: EntityMergeRequest
    resolvable_conflicts: List[EntityMergeRequestConflict]
    updated: List[EntityMergeRequestConflict]
    unresolvable_conflicts: List[EntityMergeRequestConflict]


class EntityConflictResolutionPostRequest(Schema):
    "Body for requests that resolve entity merge request conflicts"

    # pylint: disable=too-few-public-methods
    id_tag_definition_version: int
    id_entity_origin_version: int
    id_tag_instance_origin_version: int
    id_entity_destination_version: int
    id_tag_instance_destination_version: int | None = None
    id_tag_definition_persistent: str
    id_entity_origin_persistent: str
    id_tag_instance_origin_persistent: str
    id_entity_destination_persistent: str
    id_tag_instance_destination_persistent: str | None = None
    replace: bool


@router.get(
    "/{id_merge_request_persistent}/conflicts",
    response={
        200: GetEntityMergeRequestConflictsResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_merge_request_conflicts(request: HttpRequest, id_merge_request_persistent: str):
    "API method for getting merge request conflicts."
    try:
        user = check_user(request)
        merge_request = EntityMergeRequestDb.by_id_persistent(
            id_merge_request_persistent, user
        )
        writable_tag_defs = TagDefinitionDb.for_user(user, True)
        (
            resolvable_query_set,
            unresolvable_query_set,
            updated_query_set,
        ) = merge_request.resolvable_unresolvable_updated(writable_tag_defs)
        return 200, GetEntityMergeRequestConflictsResponse(
            resolvable_conflicts=[
                annotated_tag_instance_db_to_api(conflict)
                for conflict in resolvable_query_set
            ],
            unresolvable_conflicts=[
                annotated_tag_instance_db_to_api(conflict)
                for conflict in unresolvable_query_set
            ],
            updated=[
                conflict_with_updated_data_db_to_api(updated)
                for updated in updated_query_set
            ],
            merge_request=entity_merge_request_db_to_api(merge_request),
        )
    except EntityMergeRequestDb.DoesNotExist:  # pylint: disable=no-member
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
    resolution_info: EntityConflictResolutionPostRequest,
):
    "API method for resolving merge conflicts."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
        if user.permission_group not in [
            CosmaeUserDb.EDITOR,
            CosmaeUserDb.COMMISSIONER,
        ]:
            return 403, ApiError(msg="Insufficient permissions.")
        merge_request = EntityMergeRequestDb.by_id_persistent(
            id_merge_request_persistent, user
        )
        if merge_request.state != EntityMergeRequestDb.OPEN:
            return 400, ApiError(
                msg="Can only resolve conflicts for open merge requests."
            )
        tag_definition = TagDefinitionDb.most_recent_by_id(
            resolution_info.id_tag_definition_persistent
        )
        if not tag_definition.has_write_access(user.id_persistent):
            return 403, ApiError(msg="You can not write to the tag definition.")
        EntityConflictResolutionDb.objects.filter(  # pylint: disable=no-member
            tag_definition__id_persistent=resolution_info.id_tag_definition_persistent,
            entity_origin__id_persistent=(resolution_info.id_entity_origin_persistent),
            tag_instance_origin__id_persistent=resolution_info.id_tag_instance_origin_persistent,
            entity_destination__id_persistent=(
                resolution_info.id_entity_destination_persistent
            ),
            merge_request=merge_request,
        ).delete()
        resolution = EntityConflictResolutionDb(
            tag_definition_id=resolution_info.id_tag_definition_version,
            entity_origin_id=resolution_info.id_entity_origin_version,
            tag_instance_origin_id=resolution_info.id_tag_instance_origin_version,
            entity_destination_id=resolution_info.id_entity_destination_version,
            tag_instance_destination_id=resolution_info.id_tag_instance_destination_version,
            merge_request=merge_request,
            replace=resolution_info.replace,
        )
        resolution.save()
        return 200, None
    except EntityMergeRequestDb.DoesNotExist:  # pylint: disable=no-member
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
        user = check_user(request)
        if not user.permission_group in [
            CosmaeUserDb.EDITOR,
            CosmaeUserDb.COMMISSIONER,
        ]:
            return 403, ApiError(msg="Insufficient permissions")
        with transaction.atomic():
            merge_request = (
                EntityMergeRequestDb.by_id_persistent_query_set(
                    id_merge_request_persistent
                )
                .select_for_update()
                .get()
            )
            if not (
                merge_request.state == EntityMergeRequestDb.OPEN
                or EntityMergeRequestDb.ERROR
            ):
                return 400, ApiError(msg="Merge request not available for merging.")
            writable_tag_defs = TagDefinitionDb.for_user(user, True)
            resolvable, _, updated = merge_request.resolvable_unresolvable_updated(
                writable_tag_defs
            )
            if len(updated) > 0:
                return 400, ApiError(
                    msg="There are conflicts for the merge request, "
                    "where the underlying data has changed."
                )
            if (
                len(
                    [
                        conflict
                        for conflict in resolvable
                        if conflict.conflict_resolution_replace is None
                    ]
                )
                > 0
            ):
                return 400, ApiError(
                    msg="There are unresolved conflicts, that are resolvable by you."
                )
            merge_request.state = EntityMergeRequestDb.RESOLVED
            merge_request.save(update_fields=["state"])
            enqueue(
                apply_entity_merge_request,
                str(merge_request.id_persistent),
                str(user.id_persistent),
            )
            return 200, None
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except EntityMergeRequestDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Merge Request does not exist.")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not mark the merge request for merging in the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not mark the merge request for merging.")


@router.post(
    "/{id_merge_request_persistent}/reverse_origin_destination",
    response={
        200: EntityMergeRequest,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def reverse_origin_destination(request: HttpRequest, id_merge_request_persistent: str):
    "Reverse origin and destination of an entity merge request."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group not in [CosmaeUserDb.EDITOR, CosmaeUserDb.COMMISSIONER]:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        merge_request_existing_query_set = (
            EntityMergeRequestDb.by_id_persistent_query_set(id_merge_request_persistent)
        )
        merge_request_existing_query_set.select_for_update()
        merge_request_existing = merge_request_existing_query_set.get()
        if merge_request_existing.state != EntityMergeRequestDb.OPEN:
            return 400, ApiError(
                msg="Can only reverse origin and destination for open merge requests."
            )
        merge_request_existing.swap_origin_destination()
        merge_request_updated = EntityMergeRequestDb.by_id_persistent(
            id_merge_request_persistent, user
        )
        return 200, entity_merge_request_db_to_api(merge_request_updated)
    except EntityConflictResolutionDb.DoesNotExist:  # pylint: disable= no-member
        return 404, ApiError(msg="Entity merge request does not exist.")
    except ForbiddenException:
        return 403, ApiError(msg="Insufficient permissions")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not swap the merge request origin and destination in the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not swap origin and destination of entity merge request."
        )


@router.put(
    "{id_entity_origin_persistent}/{id_entity_destination_persistent}",
    response={
        200: EntityMergeRequest,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def put(
    request: HttpRequest, id_entity_origin_persistent, id_entity_destination_persistent
):
    "Create a new entity merge request."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group not in [CosmaeUserDb.EDITOR, CosmaeUserDb.COMMISSIONER]:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        entity_origin = EntityDb.most_recent_by_id(id_entity_origin_persistent)
        entity_destination = EntityDb.most_recent_by_id(
            id_entity_destination_persistent
        )
        if entity_origin.disabled or entity_destination.disabled:
            return 400, ApiError(msg="Can not merge disabled entities.")
        try:
            existing = EntityMergeRequestDb.get_existing_query_set(
                id_entity_origin_persistent, id_entity_destination_persistent
            ).get()
            if existing.state in [
                EntityMergeRequestDb.OPEN,
                EntityMergeRequestDb.ERROR,
                EntityMergeRequestDb.CONFLICTS,
            ]:
                return 200, entity_merge_request_db_to_api(existing)
            return 400, ApiError(msg="Merge Request exists but is not open")
        except EntityMergeRequestDb.DoesNotExist:  # pylint: disable=no-member
            pass
        (
            entity_merge_request,
            _,
        ) = EntityMergeRequestDb.objects.get_or_create(  # pylint: disable=no-member
            id_origin_persistent=id_entity_origin_persistent,
            id_destination_persistent=id_entity_destination_persistent,
            created_by=user,
            created_at=timestamp(),
            id_persistent=uuid4(),
            state=EntityMergeRequestDb.OPEN,
        )
        return 200, entity_merge_request_db_to_api(entity_merge_request)
    except EntityDb.DoesNotExist:  # pylint: disable=no-member
        return 400, ApiError(msg="One of the entities does not exist")


merge_request_step_db_to_api_map = {
    EntityMergeRequestDb.OPEN: "OPEN",
    EntityMergeRequestDb.CONFLICTS: "CONFLICTS",
    EntityMergeRequestDb.CLOSED: "CLOSED",
    EntityMergeRequestDb.RESOLVED: "RESOLVED",
    EntityMergeRequestDb.MERGED: "MERGED",
    EntityMergeRequestDb.ERROR: "ERROR",
}


@router.get(
    "all",
    response={
        200: EntityMergeRequestList,
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
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group not in [CosmaeUserDb.EDITOR, CosmaeUserDb.COMMISSIONER]:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        merge_requests = (
            EntityMergeRequestDb.objects.filter(  # pylint: disable=no-member
                state__in=[
                    EntityMergeRequestDb.OPEN,
                    EntityMergeRequestDb.CLOSED,
                    EntityMergeRequestDb.CONFLICTS,
                ]
            )
        )
        entity_merge_requests_with_not_existing = [
            entity_merge_request_db_to_api(mr) for mr in merge_requests
        ]

        return 200, EntityMergeRequestList(
            entity_merge_requests=[
                mr for mr in entity_merge_requests_with_not_existing if mr is not None
            ]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get entity merge requests.")


@router.get(
    "{id_merge_request_persistent}",
    response={
        200: EntityMergeRequest,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get(request: HttpRequest, id_merge_request_persistent):
    "Create a new entity merge request."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group not in [CosmaeUserDb.EDITOR, CosmaeUserDb.COMMISSIONER]:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        try:
            merge_request = EntityMergeRequestDb.get_by_id_persistent(
                id_merge_request_persistent
            )
            if merge_request.state in [
                EntityMergeRequestDb.OPEN,
                EntityMergeRequestDb.ERROR,
                EntityMergeRequestDb.CONFLICTS,
            ]:
                return 200, entity_merge_request_db_to_api(merge_request)
            return 400, ApiError(msg="Merge Request exists but is not open")
        except EntityMergeRequestDb.DoesNotExist:  # pylint: disable=no-member
            return ApiError(msg="Entity merge request does not exist")
    except Exception:  # pylint: disable=broad-except
        return ApiError(msg="Could not get requested merge request.")


def entity_merge_request_db_to_api(merge_request: EntityMergeRequestDb):
    "Convert basic information of an entity merge request from DB to API representation."
    try:
        origin = EntityJustification.annotate_justification(
            EntityDb.most_recent_by_id_queryset(merge_request.id_origin_persistent)
        )
        destination = EntityJustification.annotate_justification(
            EntityDb.most_recent_by_id_queryset(merge_request.id_destination_persistent)
        )
    except IndexError:
        return None
    return EntityMergeRequest(
        id_persistent=str(merge_request.id_persistent),
        origin=person_db_to_api(origin.get()),
        destination=person_db_to_api(destination.get()),
        created_by=user_db_to_public_user_info(merge_request.created_by),
        state=merge_request_step_db_to_api_map[merge_request.state],
    )


def annotated_tag_instance_db_to_api(annotated_instance):
    "Converts an annotated tag instance from DB to API representation"
    tag_definition = annotated_instance.tag_definition
    tag_instance_destination_db = annotated_instance.tag_instance_destination
    if tag_instance_destination_db is None:
        tag_instance_destination = None
    else:
        tag_instance_destination = TagInstance(
            id_persistent=tag_instance_destination_db["id_persistent"],
            version=tag_instance_destination_db["id"],
            value=tag_instance_destination_db["value"],
        )
    return EntityMergeRequestConflict(
        tag_definition=tag_definition_json_field_to_api(tag_definition),
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
    tag_definition = annotated_conflict.tag_definition_most_recent
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
    return EntityMergeRequestConflict(
        tag_definition=tag_definition_json_field_to_api(tag_definition),
        tag_instance_origin=TagInstance(
            id_persistent=tag_instance_origin["id_persistent"],
            version=tag_instance_origin["id"],
            value=tag_instance_origin["value"],
        ),
        tag_instance_destination=tag_instance_destination,
        # Underlying data has changed!
        replace=None,
    )


def tag_definition_json_field_to_api(tag_def_dict):
    "Converts an as JSONField annotated tag definition to API representation."
    id_persistent = tag_def_dict["id_persistent"]
    name = tag_def_dict["name"]
    return TagDefinition(
        version=tag_def_dict["id"],
        name_path=get_tag_definition_name_path_from_parts(id_persistent, name),
        id_persistent=id_persistent,
        id_parent_persistent=tag_def_dict["id_parent_persistent"],
        curated=tag_def_dict["curated"],
    )
