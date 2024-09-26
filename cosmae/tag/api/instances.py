"API methods for tag instances."

from datetime import datetime
from typing import List
from uuid import uuid4

from django.db import IntegrityError
from django.db.models import Value
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import (
    ApiError,
    DbObjectExistsException,
    EntityMissingException,
    EntityUpdatedException,
    InvalidTagValueException,
    NotAuthenticatedException,
    TagDefinitionDisabledException,
    TagDefinitionMissingException,
    TagDefinitionPermissionException,
    ValidationException,
)
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.api.models_api import TagInstancePost
from cosmae.tag.api.models_conversion import tag_instance_db_to_api
from cosmae.tag.models_django import TagInstance as TagInstanceDb
from cosmae.tag.models_django import TagInstanceAbstract as TagInstanceAbstractDb
from cosmae.tag.models_django import TagInstanceHistory as TagInstanceHistoryDb
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user
from cosmae.util.django import save_many_atomic

router = Router()

MAX_TAG_INSTANCE_CHUNK_LIMIT = 10000
MAX_TAG_INSTANCE_VALUE_LIMIT = 50000


class TagInstancePostList(Schema):
    # pylint: disable=too-few-public-methods
    "Multiple tag instances for post requests."
    tag_instances: List[TagInstancePost]


class TagInstancePostChunkRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for getting instances of a tag."
    id_tag_definition_persistent: str
    offset: int
    limit: int


class TagInstanceForEntitiesPostRequest(Schema):
    "Request body for getting tag instances for a set of entities"

    # pylint: disable=too-few-public-methods
    id_tag_definition_persistent_list: List[str]
    id_entity_persistent_list: List[str]
    id_merge_request_persistent: str | None = None
    """When a merge request is referenced,
    the values of the origin tag are also returned. when querying for the destination."""
    id_contribution_persistent: str | None = None
    """When a contribution is referenced, all merge requests contained are considered.
    I.e., for all merge requests of the contribution,
    when the destination tag is queried values for the origin tag are also returned."""


class TagInstanceValueRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for getting a specific value"
    id_entity_persistent: str
    id_tag_definition_persistent: str


class TagInstanceValueRequestList(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for multiple value request"
    value_requests: List[TagInstanceValueRequest]


class TagInstanceValueResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Response for a value request"
    id_entity_persistent: str
    id_tag_definition_persistent: str
    values: List[TagInstancePost]


class TagInstanceValueWithExistingFlagResponse(TagInstancePost):
    # pylint: disable= too-few-public-methods
    """Tag instance value with a flag for marking data as existing.
    This is used in context of retrieving values of tag definitions
    that are part of a merge request or the entity review of contributions."""
    is_existing: bool
    id_tag_definition_requested_persistent: str


class TagInstanceValueResponseList(Schema):
    # pylint: disable=too-few-public-methods
    "Multiple Value request responses"
    value_responses: List[TagInstanceValueResponse]


class TagInstanceForEntitiesPostResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Response body for getting tag instances for a set of entities."
    value_responses: List[TagInstanceValueWithExistingFlagResponse]


class TagInstanceUpdatedResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Information on updates when submitting values"
    msg: str
    tag_instances: List[TagInstancePost]


@router.post(
    "",
    response={
        200: TagInstancePostList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        409: TagInstanceUpdatedResponse,
        500: ApiError,
    },
)
def post_tag_instance(request: HttpRequest, tag_list: TagInstancePostList):
    "Create or change a tag instance."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    tag_apis = tag_list.tag_instances
    now = timestamp()
    try:
        tag_dbs = [tag_instance_api_to_db(tag, user, now) for tag in tag_apis]
    except ValidationException as exc:
        return 400, ApiError(msg=str(exc))
    except DbObjectExistsException as exc:
        return 500, ApiError(
            msg="Could not generate id_persistent for tag instance with "
            f"id_entity_persistent {exc.values['id_entity_persistent']}, "
            f"id_tag_definition_persistent {exc.values['id_tag_definition_persistent']} and "
            f"value {exc.values['value']}."
        )
    except EntityMissingException as exc:
        return 400, ApiError(
            msg=f"There is no entity with id_persistent {exc.id_persistent}."
        )
    except TagDefinitionMissingException as exc:
        return 400, ApiError(
            msg=f"There is no tag definition with id_persistent {exc.id_persistent}."
        )
    except InvalidTagValueException as exc:
        return 400, ApiError(
            msg=f"Value {exc.value} should be of type {exc.type_name} "
            f"for tag with id_persistent {exc.tag_id_persistent}."
        )
    except TagDefinitionPermissionException as exc:
        return 403, ApiError(
            msg="Your are not allowed to change the tag definition with id_persistent: "
            f"{exc.id_persistent}"
        )
    except TagDefinitionDisabledException as exc:
        return 403, ApiError(
            msg=f"Tag definition with with id_persistent: {exc.id_persistent} is disabled."
        )
    except EntityUpdatedException as exc:
        return 409, TagInstanceUpdatedResponse(
            msg="There has been a concurrent modification "
            f"to the tag instance with id_persistent {exc.new_value.id_persistent}.",
            tag_instances=[tag_instance_db_to_api(exc.new_value)],
        )
    tag_db_saves = [tag for tag, do_write in tag_dbs if do_write]
    try:
        save_many_atomic(tag_db_saves)
    except IntegrityError as exc:
        return 500, ApiError(msg="Provided data not consistent with database.")
    response_tag_instances = [tag_instance_db_to_api(tag) for tag, _ in tag_dbs]
    return 200, TagInstancePostList(tag_instances=response_tag_instances)


@router.post("chunk", response={200: TagInstancePostList, 400: ApiError, 500: ApiError})
def post_tag_instance_chunks(
    request, chunk_req: TagInstancePostChunkRequest  # pylint: disable=unused-argument
):
    "API method for retrieving a chunk of tag instances."
    if chunk_req.limit > MAX_TAG_INSTANCE_CHUNK_LIMIT:
        return 400, ApiError(
            msg=f"Please specify limit smaller than {MAX_TAG_INSTANCE_CHUNK_LIMIT}."
        )
    try:
        instance_dbs = TagInstanceDb.by_tag_chunked_queryset(
            chunk_req.id_tag_definition_persistent, chunk_req.offset, chunk_req.limit
        )
        instance_apis = [tag_instance_db_to_api(tag) for tag in instance_dbs]
        return 200, TagInstancePostList(tag_instances=instance_apis)
    except TagDefinitionMissingException as exc:
        return 400, ApiError(
            msg=f"Tag definition with id_persistent {exc.id_persistent} does not exist."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested chunk.")


@router.post(
    "values",
    response={
        200: TagInstanceValueResponseList,
        400: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_tag_instance_values(
    request, values_req: TagInstanceValueRequestList
):  # pylint: disable=unused-argument
    "API method for obtaining specific tag instance values."
    if len(values_req.value_requests) > MAX_TAG_INSTANCE_VALUE_LIMIT:
        return 400, ApiError(
            msg=f"Please specify limit smaller than {MAX_TAG_INSTANCE_VALUE_LIMIT}."
        )
    try:
        ret = []
        for req in values_req.value_requests:
            id_entity_persistent = req.id_entity_persistent
            id_tag_definition_persistent = req.id_tag_definition_persistent
            vals = TagInstanceDb.most_recent_by_entity_and_definition_id_query_set(
                id_entity_persistent, id_tag_definition_persistent
            )
            ret.append(
                TagInstanceValueResponse(
                    id_entity_persistent=id_entity_persistent,
                    id_tag_definition_persistent=id_tag_definition_persistent,
                    values=[tag_instance_db_to_api(val) for val in vals],
                )
            )
        return 200, TagInstanceValueResponseList(value_responses=ret)
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested values.")


@router.post(
    "entities",
    response={
        200: TagInstanceForEntitiesPostResponse,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_tag_instances_for_entities(
    request: HttpRequest, request_data: TagInstanceForEntitiesPostRequest
):
    """API method for getting tag instances for a list of entities.
    Also include tag instances of tag definitions that are related by
    contribution or merge request."""
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if (
        len(request_data.id_entity_persistent_list) == 0
        or len(request_data.id_tag_definition_persistent_list) == 0
    ):
        return 200, TagInstanceForEntitiesPostResponse(value_responses=[])
    try:
        instances_all = TagInstanceDb.objects.none()  # pylint: disable=no-member
        for (
            id_tag_definition_persistent
        ) in request_data.id_tag_definition_persistent_list:
            tag_definitions = TagMergeRequest.get_tag_definitions_for_entities_request(
                id_tag_definition_persistent,
                request_data.id_contribution_persistent,
                request_data.id_merge_request_persistent,
                user,
            )
            for id_tag_def, is_existing in tag_definitions:
                instances_for_tag = TagInstanceDb.for_entities(
                    id_tag_def,
                    request_data.id_entity_persistent_list,
                ).annotate(
                    is_existing=Value(is_existing),
                    id_tag_definition_requested_persistent=Value(
                        id_tag_definition_persistent
                    ),
                )
                instances_all = instances_all.union(instances_for_tag)
        return 200, TagInstanceForEntitiesPostResponse(
            value_responses=[
                tag_instance_with_existing_db_to_api(tag_instance)
                for tag_instance in instances_all
            ]
        )

    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not get the tag instances for the provided entities."
        )


def tag_instance_api_to_db(tag_api: TagInstancePost, user: CosmaeUser, time: datetime):
    "Convert a tag instance from API to database representation."
    if tag_api.id_persistent:
        persistent_id = tag_api.id_persistent
        if tag_api.version is None:
            raise ValidationException(
                f"Tag instance with id_persistent {tag_api.id_persistent} "
                "has no previous version."
            )
    else:
        if tag_api.version:
            raise ValidationException(
                f"Tag instance with id_entity_persistent {tag_api.id_entity_persistent}, "
                f"id_tag_definition_persistent {tag_api.id_tag_definition_persistent} and "
                f"value {tag_api.value} has version but no id_persistent."
            )
        persistent_id = str(uuid4())
    return TagInstanceHistoryDb.change_or_create_versioned(
        id_persistent=persistent_id,
        id_entity_persistent=tag_api.id_entity_persistent,
        id_tag_definition_persistent=tag_api.id_tag_definition_persistent,
        written_by_session=user.edit_session,
        value=tag_api.value,
        time_edit=time,
        version=tag_api.version,
    )


def tag_instance_with_existing_db_to_api(
    tag_db: TagInstanceAbstractDb,
) -> TagInstancePost:
    "Convert tag instances from database to API representation."
    return TagInstanceValueWithExistingFlagResponse(
        id_persistent=tag_db.id_persistent,
        id_entity_persistent=tag_db.id_entity_persistent,
        id_tag_definition_persistent=tag_db.id_tag_definition_persistent,
        value=tag_db.value,
        version=tag_db.id,
        is_existing=tag_db.is_existing,
        id_tag_definition_requested_persistent=tag_db.id_tag_definition_requested_persistent,
    )
