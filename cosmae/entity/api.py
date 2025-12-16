"""API for handling entities."""

from datetime import datetime
from logging import getLogger
from typing import Dict, List, Optional, Union
from uuid import uuid4

from django.db import IntegrityError, transaction
from django.db.models import F, TextField, Value
from django.db.models.functions import Cast
from django.http import HttpRequest
from ninja import Field, Router, Schema

from cosmae.column.models_api import ColumnResponse
from cosmae.column.models_conversion import column_db_dict_to_api
from cosmae.comments.api import Comment
from cosmae.entity.filter_conversion import filter_to_django_q
from cosmae.entity.models_api import FilterClause
from cosmae.entity.models_django import Entity as EntityDb
from cosmae.entity.models_django import EntityHistory, entity_objects
from cosmae.entity.queue import get_display_txt_info
from cosmae.exception import (
    ApiError,
    DbObjectExistsException,
    EntityUpdatedException,
    NotAuthenticatedException,
    ValidationException,
)
from cosmae.justification.models_django import (
    EntityJustification as EntityJustificationDb,
)
from cosmae.management.display_txt.util import DISPLAY_TXT_ORDER_CONFIG_KEY
from cosmae.management.models_django import ConfigValue
from cosmae.user.model_conversion.public import user_db_to_public_user_info
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user
from cosmae.value.models_api import ValuePost
from cosmae.value.models_conversion import (
    value_db_to_api,
)
from cosmae.value.models_django import value_objects

router = Router()
_LOGGER = getLogger(__name__)

_CHUNK_LIMIT = 1000


class EntityRequest(Schema):
    # pylint: disable=too-few-public-methods
    """API model for a natural person."""

    display_txt: str | None = None
    version: int | None = None
    """The version of the person that the change is made on.
    If null on POST, a new person is created."""
    id_persistent: str | None = None
    disabled: bool | None = None
    display_txt_details: Union[str, ColumnResponse] | None = None


class EntityWithJustificationRequest(EntityRequest):
    "API Model for an entity with justification"

    justification_txt: str | None = None


class EntityResponse(Schema):
    # pylint: disable=too-few-public-methods
    """API model for a natural person."""

    display_txt: str
    version: int
    id_persistent: str
    disabled: bool
    display_txt_details: Union[str, ColumnResponse]


class JustificationList(Schema):
    # pylint: disable=too-few-public-methods
    """API model for multiple entity justifications"""
    justifications: List[Comment]


class JustificationPostRequest(Schema):
    "API model for posting entity justifications"

    # pylint: disable=too-few-public-methods
    justification_txt: str


class JustificationPostResponse(Schema):
    "API model for entity justification in response"

    # pylint: disable=too-few-public-methods
    justification: Comment


class EntityJustificationAddRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for adding a new entity justification"
    text: str


class EntityWithJustification(EntityResponse):
    "API Model for an entity with justification"

    # pylint: disable=too-few-public-methods
    justification_txt: str | None = None


class EntityList(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple natural entities."""

    entity_list: List[EntityRequest]


class EntityWithJustificationRequestList(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple natural entities
    with justification for being in the db,
    used for requests"""

    entity_list: List[EntityWithJustificationRequest]


class EntityWithJustificationList(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple natural entities
    with justification for being in the db,
    used for responses"""

    entity_list: List[EntityWithJustification]


class EntityWithJustificationMapping(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple natural entities
    with justification for being in the db,
    used for responses"""

    entity_map: Dict[str, EntityWithJustification]


class EntityWithJustificationOffsetList(EntityWithJustificationList):
    # pylint: disable=too-few-public-methods
    "Adds an offset to list with entities and justification."
    next_offset: int


class EntityGetRequest(Schema):
    # pylint: disable=too-few-public-methods
    """Model for return type of posting entities."""

    modified_ids: List[str]


class EntityDetailsPostRequest(Schema):
    # pylint: disable=too-few-public-methods
    """Request body for getting entity details."""

    id_entity_persistent_list: List[str]
    up_until_time: datetime | None = None


class ChunkRequest(Schema):
    # pylint: disable=too-few-public-methods
    """Request body for chunks of entities"""

    offset: int
    limit: int
    up_until_time: datetime | None = None


class EntityDetailsResponse(Schema):
    # pylint: disable=too-few-public-methods
    """API Response combining an entity with its values."""
    entity: EntityRequest
    value_list: List[ValuePost]


class EntitySearchResult(Schema):
    # pylint: disable=too-few-public-methods
    """API response for a single search result."""
    match_value: str
    id_entity_persistent: str
    id_column_persistent: Optional[str]


class EntitySearchResultList(Schema):
    # pylint: disable=too-few-public-methods
    """API response for multiple search results"""
    search_result_list: List[EntitySearchResult]


class EntityIdList(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple entity ids."""
    id_entity_persistent_list: List[str]
    next_offset: int


class FilterRequest(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for filter request."""
    filter: FilterClause | None = Field(default=None)
    up_until_time: datetime | None = None
    offset: int = 0
    limit: int


@router.post(
    "",
    response={
        200: EntityWithJustificationList,
        400: ApiError,
        401: ApiError,
        500: ApiError,
        403: ApiError,
    },
)
def entities_post(
    request: HttpRequest, entities: EntityWithJustificationRequestList
):  # pylint: disable=too-many-return-statements
    """Add an entity to the DB.
    Returns:
        EntityList: The updated entities.
    """
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group in {CosmaeUser.APPLICANT, CosmaeUser.READER}:
        return 403, ApiError(msg="Insufficient Permissions")
    now = timestamp()
    try:
        entity_dbs = [
            entity_api_to_db(entity, now, user) for entity in entities.entity_list
        ]
    except ValidationException as valid_x:
        return 400, ApiError(msg=str(valid_x))
    except DbObjectExistsException as exc:
        return 500, ApiError(
            msg=(
                "Could not generate an id for entity "
                f"with display_txt {exc.values['display_txt']}."
            )
        )
    except EntityUpdatedException as updated_x:
        return 400, ApiError(
            msg="There has been a concurrent modification "
            f"to the entity with id_persistent {updated_x.new_value.id_persistent}."
        )

    try:
        with transaction.atomic():
            for entity, do_write, justification in entity_dbs:
                entity.justification_txt = justification.text
                if do_write:
                    entity.save()
    except IntegrityError:
        return 500, ApiError(msg="Provided data not consistent with database.")
    return 200, EntityWithJustificationList(
        entity_list=[entity_db_to_api(person) for person, _, _, in entity_dbs]
    )


@router.post(
    "chunk",
    response={
        200: EntityWithJustificationOffsetList,
        400: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def entities_chunks_post(
    request: HttpRequest, req_data: ChunkRequest  # pylint: disable=unused-argument
):
    """Get a chunk of entities.
    Note:
        The entities are ordered by the order of initial creation."""
    if req_data.limit > _CHUNK_LIMIT:
        return 400, ApiError(msg=f"Please specify limit smaller than {_CHUNK_LIMIT}.")
    user = check_user(request)
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions")
    try:
        entity_db_list = (
            entity_objects(req_data.up_until_time)
            .primary_only()
            .exclude_contributed()
            .chunk(req_data.offset, req_data.limit)
            .annotate_justification()
        )
        next_offset = -1
        entity_api_list = []
        for entity_db in entity_db_list:
            entity_api_list.append(entity_db_to_api(entity_db, req_data.up_until_time))
            next_offset = max(entity_db.id, next_offset)
        return 200, EntityWithJustificationOffsetList(
            entity_list=entity_api_list, next_offset=next_offset + 1
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested chunk.")


@router.get(
    "values",
    response={
        200: EntityDetailsResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_values(
    request: HttpRequest, id_persistent: str, up_until_time: datetime | None = None
):
    "API method for retrieving all instances for a specific entity."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        entity = (
            entity_objects(up_until_time)
            .by_id_persistent(id_persistent=id_persistent)
            .annotate_justification()
        ).get()
        instances_db = value_objects(up_until_time).for_entity_queryset(
            id_persistent, user
        )
        instances_api = [value_db_to_api(instance) for instance in instances_db]
        return 200, EntityDetailsResponse(
            entity=entity_db_to_api(entity, up_until_time), value_list=instances_api
        )
    except EntityDb.DoesNotExist:
        return 404, ApiError(msg="Entity does not exist")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get instances")


@router.post(
    "filter",
    response={
        200: EntityIdList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def filter_entities(request: HttpRequest, filter_body: FilterRequest):
    "Filter entities based on provided filter."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        entity_queryset = entity_objects(filter_body.up_until_time)
        look_ahead = min(100, filter_body.limit)
        batch_offset = filter_body.offset
        entity_id_list: List[str] = []
        django_q = filter_to_django_q(filter_body.filter)
        next_request_offset = -1
        while len(entity_id_list) < filter_body.limit:
            offset_queryset = entity_queryset.gte_id_version(batch_offset)
            if not offset_queryset.exists():
                break
            look_ahead_queryset = offset_queryset.lt_id_version(
                batch_offset + look_ahead
            ).order_by("id")
            if django_q is not None:
                look_ahead_queryset = look_ahead_queryset.filter_by_values(
                    value_objects(filter_body.up_until_time), django_q
                )
            entity_id_list += look_ahead_queryset.values_list(
                "id_persistent", flat=True
            )
            if look_ahead_queryset:
                next_request_offset = look_ahead_queryset.last().id + 1
            batch_offset += look_ahead
        return 200, EntityIdList(
            id_entity_persistent_list=entity_id_list, next_offset=next_request_offset
        )
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error("Error filtering entities.", exc_info=exc)
        return 500, ApiError(msg="Could not filter entities.")


@router.post(
    "details",
    response={
        200: EntityWithJustificationMapping,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_details(request: HttpRequest, body: EntityDetailsPostRequest):
    "Get details for an entity"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    if len(body.id_entity_persistent_list) == 0:
        return 400, ApiError(msg="No entity id_persistents provided.")
    if len(body.id_entity_persistent_list) > _CHUNK_LIMIT:
        return 400, ApiError(
            msg=f"Please provide less than {_CHUNK_LIMIT} entity id_persistents."
        )
    try:
        entity_queryset = (
            entity_objects(body.up_until_time)
            .in_id_persistent_list(id_persistent_list=body.id_entity_persistent_list)
            .annotate_justification(body.up_until_time)
        )
        return 200, EntityWithJustificationMapping(
            entity_map={
                entity.id_persistent: entity_db_to_api(entity)
                for entity in entity_queryset
            }
        )
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error("Error getting entity details.", exc_info=exc)
        return 500, ApiError(msg="Could not get instances")


@router.get(
    "search",
    response={200: EntitySearchResultList, 401: ApiError, 403: ApiError, 500: ApiError},
)
def search(request: HttpRequest, term: str, up_until_time: datetime | None = None):
    "Search for an entity"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient privileges.")
    try:
        display_txt_results = (
            entity_objects(up_until_time)
            .exclude_contributed()
            .search(term)
            .values(
                id_entity_persistent=F("id_persistent"),
                id_column_persistent=Value(None, TextField()),
                value=F("display_txt"),
            )
        )
        value_results = (
            value_objects(up_until_time)
            .search(
                term,
                id_columns=ConfigValue.objects.filter(key=DISPLAY_TXT_ORDER_CONFIG_KEY)
                .annotate(text_value=Cast("value", TextField()))
                .values("text_value"),
            )
            .values("id_entity_persistent", "id_column_persistent", "value")
        )
        without_known = value_results.exclude(
            id_entity_persistent__in=display_txt_results.values("id_entity_persistent")
        )
        union_results = display_txt_results.union(without_known)
        return 200, EntitySearchResultList(
            search_result_list=[
                entity_search_result_db_to_api(entity) for entity in union_results
            ]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not search entities.")


@router.post(
    "{id_entity_source_persistent}/merge/{id_entity_destination_persistent}",
    response={400: ApiError, 401: ApiError, 403: ApiError, 500: ApiError},
)
def merge_entities(
    request: HttpRequest,
    id_entity_source_persistent: str,
    id_entity_destination_persistent: str,
):
    "Initializes merging of two entities."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group not in [CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER]:
        return 403, ApiError(msg="Insufficient permissions.")
    entity_source = EntityDb.most_recent_by_id(id_entity_source_persistent)
    if entity_source.disabled:
        return 400, ApiError(msg="Source entity is disabled.")
    entity_destination = EntityDb.most_recent_by_id(id_entity_destination_persistent)
    if entity_destination.disabled:
        return 400, ApiError(msg="Destination entity is disabled.")
    return 400, ApiError


@router.get(
    "{id_entity_persistent}/justifications",
    response={200: JustificationList, 401: ApiError, 403: ApiError, 500: ApiError},
)
def get_justifications(
    request: HttpRequest, id_entity_persistent, up_until_time: datetime | None = None
):
    "Get justifications for an entity being in the database"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions")
    try:
        justifications = EntityJustificationDb.for_id_entity_persistent_asc(
            id_entity_persistent, up_until_time=up_until_time
        )
        return 200, JustificationList(
            justifications=[
                justification_db_to_api(justification)
                for justification in justifications
            ]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get Justifications.")


@router.put(
    "{id_entity_persistent}/justifications",
    response={
        200: JustificationPostResponse,
        302: JustificationPostResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def put_justification(
    request: HttpRequest, id_entity_persistent, justification: JustificationPostRequest
):
    """Add a justification for an entity being in the db"""
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions")
    try:
        EntityDb.most_recent_by_id(id_entity_persistent)
        time_written = timestamp()
        justification_created, justification_is_new = EntityJustificationDb.add(
            id_persistent=uuid4(),
            id_entity_persistent=id_entity_persistent,
            text=justification.justification_txt,
            timestamp=time_written,
            author=user,
        )
        if justification_is_new:
            status = 200
        else:
            status = 302
        return status, JustificationPostResponse(
            justification=justification_db_to_api(justification_created)
        )
    except EntityDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Entity does not exist")
    except EntityJustificationDb.EmptyJustificationException:
        return 400, ApiError(msg="Empty justification provided")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get Justifications.")


def entity_api_to_db(
    entity: EntityRequest, time_edit: datetime, requester: CosmaeUser
) -> EntityDb:
    """Transform an natural entity from API to DB model."""
    version = entity.version
    if entity.id_persistent:
        persistent_id = entity.id_persistent
        if entity.version is None:
            raise ValidationException(
                f"entity with persistent_id {entity.id_persistent} "
                "has no previous version."
            )
    else:
        if version:
            raise ValidationException(
                f"Entity with display_txt {entity.display_txt} "
                "has version but no persistent_id."
            )
        if entity.justification_txt is None:
            raise ValidationException(
                f"No justification given for entity with display_txt {entity.display_txt}"
            )
        persistent_id = str(uuid4())
    entity_db, save_entity = EntityHistory.change_or_create_versioned(
        display_txt=entity.display_txt,
        time_edit=time_edit,
        id_persistent=persistent_id,
        written_by_session=requester.edit_session,
        version=entity.version,
        disabled=entity.disabled or False,
    )
    if entity.justification_txt is None:
        try:
            justification = EntityJustificationDb.for_id_entity_persistent_desc(
                persistent_id
            )[:1].get()
        except EntityJustificationDb.DoesNotExist:  # pylint: disable=no-member
            justification = None
    else:
        try:
            justification, _justification_is_new = EntityJustificationDb.add(
                id_persistent=uuid4(),
                id_entity_persistent=persistent_id,
                text=entity.justification_txt,
                timestamp=time_edit,
                author=requester,
            )
        except EntityJustificationDb.EmptyJustificationException as exc:
            if version is None:
                raise ValidationException(
                    "Empty justification provided for entity "
                    f"with display txt {entity.display_txt}"
                ) from exc
    return entity_db, save_entity, justification


def entity_db_to_api(
    entity: EntityDb, up_until_time: datetime | None = None
) -> EntityRequest:
    """Transform a natural entity from DB to API representation."""
    display_txt = entity.display_txt
    id_persistent = entity.id_persistent
    display_txt, display_txt_info = get_display_txt_info(id_persistent, display_txt)
    if isinstance(display_txt_info, dict):
        display_txt_info = column_db_dict_to_api(display_txt_info, up_until_time)
    return EntityWithJustification(
        display_txt=display_txt,
        version=entity.id,
        id_persistent=id_persistent,
        disabled=entity.disabled,
        display_txt_details=display_txt_info,
        justification_txt=entity.justification_txt,
    )


def entity_db_dict_to_api(entity: Optional[dict]) -> Optional[EntityRequest]:
    "Transform a entity natural db dict to an API representation"
    if entity is None:
        return None
    id_persistent = entity["id_persistent"]
    display_txt = entity["display_txt"]
    display_txt, display_txt_info = get_display_txt_info(id_persistent, display_txt)
    if isinstance(display_txt_info, dict):
        display_txt_info = column_db_dict_to_api(display_txt_info)
    return EntityRequest(
        display_txt=display_txt,
        version=entity["id"],
        id_persistent=id_persistent,
        disabled=entity["disabled"],
        display_txt_details=display_txt_info,
    )


def entity_search_result_db_to_api(entity: EntityDb) -> EntitySearchResult:
    "Transform an db entity to a search result"
    id_entity_persistent = entity["id_entity_persistent"]
    id_column_persistent = entity["id_column_persistent"]
    matched_value = entity["value"]
    return EntitySearchResult(
        match_value=matched_value,
        id_entity_persistent=id_entity_persistent,
        id_column_persistent=id_column_persistent,
    )


def justification_db_to_api(justification: EntityJustificationDb) -> Comment:
    "Transform a justification from database to APi representation"
    return Comment(
        content=justification.text,
        author=user_db_to_public_user_info(justification.author),
        timestamp=justification.timestamp,
    )
