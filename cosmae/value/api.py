"API methods for values."

from datetime import datetime
from logging import getLogger
from typing import List
from uuid import uuid4

from django.db import IntegrityError
from django.db.models import Value
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import (
    ApiError,
    ColumnDisabledException,
    ColumnMissingException,
    ColumnPermissionException,
    DbObjectExistsException,
    EntityMissingException,
    EntityUpdatedException,
    InvalidValueException,
    NotAuthenticatedException,
    ValidationException,
)
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user
from cosmae.util.django import save_many_atomic
from cosmae.value.models_api import ValuePost
from cosmae.value.models_conversion import value_db_to_api
from cosmae.value.models_django import Value as ValueDb
from cosmae.value.models_django import ValueAbstract as ValueAbstractDb
from cosmae.value.models_django import ValueHistory as ValueHistoryDb
from cosmae.value.models_django import value_objects

_LOGGER = getLogger(__name__)
router = Router()

MAX_VALUE_CHUNK_LIMIT = 10000
MAX_VALUE_VALUE_LIMIT = 50000


class ValuePostList(Schema):
    # pylint: disable=too-few-public-methods
    "Multiple values for post requests."
    value_list: List[ValuePost]


class ValuePostChunkRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for getting instances of a column."
    id_column_persistent: str
    up_until_time: datetime | None = None
    offset: int
    limit: int


class ValueForEntitiesPostRequest(Schema):
    "Request body for getting values for a set of entities"

    # pylint: disable=too-few-public-methods
    id_column_persistent_list: List[str]
    id_entity_persistent_list: List[str]
    id_merge_request_persistent: str | None = None
    """When a merge request is referenced,
    the values of the origin column are also returned. when querying for the destination."""
    id_contribution_persistent: str | None = None
    """When a contribution is referenced, all merge requests contained are considered.
    I.e., for all merge requests of the contribution,
    when the destination column is queried values for the origin column are also returned."""


class ValueValueRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for getting a specific value"
    id_entity_persistent: str
    id_column_persistent: str


class ValueValueRequestList(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for multiple value request"
    value_requests: List[ValueValueRequest]
    up_until_time: datetime | None = None


class ValueValueResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Response for a value request"
    id_entity_persistent: str
    id_column_persistent: str
    values: List[ValuePost]


class ValueValueWithExistingFlagResponse(ValuePost):
    # pylint: disable= too-few-public-methods
    """Value value with a flag for marking data as existing.
    This is used in context of retrieving values of columns
    that are part of a merge request or the entity review of contributions."""
    is_existing: bool
    id_column_requested_persistent: str


class ValueValueResponseList(Schema):
    # pylint: disable=too-few-public-methods
    "Multiple Value request responses"
    value_responses: List[ValueValueResponse]


class ValueForEntitiesPostResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Response body for getting values for a set of entities."
    value_responses: List[ValueValueWithExistingFlagResponse]


class ValueUpdatedResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Information on updates when submitting values"
    msg: str
    value_list: List[ValuePost]


@router.post(
    "",
    response={
        200: ValuePostList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        409: ValueUpdatedResponse,
        500: ApiError,
    },
)
def post_value(request: HttpRequest, value_list: ValuePostList):
    "Create or change a value."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    value_api_list = value_list.value_list
    now = timestamp()
    try:
        value_db_list = [value_api_to_db(value, user, now) for value in value_api_list]
    except ValidationException as exc:
        return 400, ApiError(msg=str(exc))
    except DbObjectExistsException as exc:
        return 500, ApiError(
            msg="Could not generate id_persistent for value with "
            f"id_entity_persistent {exc.values['id_entity_persistent']}, "
            f"id_column_persistent {exc.values['id_column_persistent']} and "
            f"value {exc.values['value']}."
        )
    except EntityMissingException as exc:
        return 400, ApiError(
            msg=f"There is no entity with id_persistent {exc.id_persistent}."
        )
    except ColumnMissingException as exc:
        return 400, ApiError(
            msg=f"There is no column with id_persistent {exc.id_persistent}."
        )
    except InvalidValueException as exc:
        return 400, ApiError(
            msg=f"Value {exc.value} should be of type {exc.type_name} "
            f"for column with id_persistent {exc.column_id_persistent}."
        )
    except ColumnPermissionException as exc:
        return 403, ApiError(
            msg="Your are not allowed to change the column with id_persistent: "
            f"{exc.id_persistent}"
        )
    except ColumnDisabledException as exc:
        return 403, ApiError(
            msg=f"Column with with id_persistent: {exc.id_persistent} is disabled."
        )
    except EntityUpdatedException as exc:
        return 409, ValueUpdatedResponse(
            msg="There has been a concurrent modification "
            f"to the value with id_persistent {exc.new_value.id_persistent}.",
            value_list=[value_db_to_api(exc.new_value)],
        )
    except Exception as exc: # pylint: disable=broad-except
        msg = "Could not set value"
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)
    value_db_saves = [value for value, do_write in value_db_list if do_write]
    try:
        save_many_atomic(value_db_saves)
    except IntegrityError as exc:
        return 500, ApiError(msg="Provided data not consistent with database.")
    response_value_list = [value_db_to_api(value) for value, _ in value_db_list]
    return 200, ValuePostList(value_list=response_value_list)


@router.post(
    "chunk",
    response={
        200: ValuePostList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_value_chunks(
    request, chunk_req: ValuePostChunkRequest  # pylint: disable=unused-argument
):
    "API method for retrieving a chunk of values."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group in {CosmaeUser.APPLICANT, CosmaeUser.READER}:
        return 403, ApiError(msg="Insufficient permissions.")
    if chunk_req.limit > MAX_VALUE_CHUNK_LIMIT:
        return 400, ApiError(
            msg=f"Please specify limit smaller than {MAX_VALUE_CHUNK_LIMIT}."
        )
    try:
        instance_dbs = value_objects(
            chunk_req.up_until_time
        ).by_column_chunked_queryset(
            chunk_req.id_column_persistent, chunk_req.offset, chunk_req.limit
        )
        instance_apis = [value_db_to_api(value) for value in instance_dbs]
        return 200, ValuePostList(value_list=instance_apis)
    except ColumnMissingException as exc:
        return 400, ApiError(
            msg=f"Column with id_persistent {exc.id_persistent} does not exist."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested chunk.")


@router.post(
    "values",
    response={
        200: ValueValueResponseList,
        400: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_value_values(
    request, values_req: ValueValueRequestList
):  # pylint: disable=unused-argument
    "API method for obtaining specific value values."
    if len(values_req.value_requests) > MAX_VALUE_VALUE_LIMIT:
        return 400, ApiError(
            msg=f"Please specify limit smaller than {MAX_VALUE_VALUE_LIMIT}."
        )
    try:
        ret = []
        for req in values_req.value_requests:
            id_entity_persistent = req.id_entity_persistent
            id_column_persistent = req.id_column_persistent
            vals = value_objects(
                values_req.up_until_time
            ).most_recent_by_entity_and_definition_id_query_set(
                id_entity_persistent, id_column_persistent
            )
            ret.append(
                ValueValueResponse(
                    id_entity_persistent=id_entity_persistent,
                    id_column_persistent=id_column_persistent,
                    values=[value_db_to_api(val) for val in vals],
                )
            )
        return 200, ValueValueResponseList(value_responses=ret)
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested values.")


@router.post(
    "entities",
    response={
        200: ValueForEntitiesPostResponse,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_values_for_entities(
    request: HttpRequest, request_data: ValueForEntitiesPostRequest
):
    """API method for getting values for a list of entities.
    Also include values of columns that are related by
    contribution or merge request."""
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if (
        len(request_data.id_entity_persistent_list) == 0
        or len(request_data.id_column_persistent_list) == 0
    ):
        return 200, ValueForEntitiesPostResponse(value_responses=[])
    try:
        instances_all = ValueDb.objects.none()  # pylint: disable=no-member
        for id_column_persistent in request_data.id_column_persistent_list:
            columns = ColumnMergeRequest.get_columns_for_entities_request(
                id_column_persistent,
                request_data.id_contribution_persistent,
                request_data.id_merge_request_persistent,
                user,
            )
            for id_column, is_existing in columns:
                instances_for_column = (
                    value_objects()
                    .for_entities(
                        id_column,
                        request_data.id_entity_persistent_list,
                    )
                    .annotate(
                        is_existing=Value(is_existing),
                        id_column_requested_persistent=Value(id_column_persistent),
                    )
                )
                instances_all = instances_all.union(instances_for_column)
        return 200, ValueForEntitiesPostResponse(
            value_responses=[
                value_with_existing_db_to_api(value) for value in instances_all
            ]
        )

    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get the values for the provided entities.")


def value_api_to_db(value: ValuePost, user: CosmaeUser, time: datetime):
    "Convert a value from API to database representation."
    if value.id_persistent:
        persistent_id = value.id_persistent
        if value.version is None:
            raise ValidationException(
                f"Value with id_persistent {value.id_persistent} "
                "has no previous version."
            )
    else:
        if value.version:
            raise ValidationException(
                f"Value with id_entity_persistent {value.id_entity_persistent}, "
                f"id_column_persistent {value.id_column_persistent} and "
                f"value {value.value} has version but no id_persistent."
            )
        persistent_id = str(uuid4())
    return ValueHistoryDb.change_or_create_versioned(
        id_persistent=persistent_id,
        id_entity_persistent=value.id_entity_persistent,
        id_column_persistent=value.id_column_persistent,
        written_by_session=user.edit_session,
        value=value.value,
        time_edit=time,
        version=value.version,
    )


def value_with_existing_db_to_api(
    value_db: ValueAbstractDb,
) -> ValuePost:
    "Convert values from database to API representation."
    return ValueValueWithExistingFlagResponse(
        id_persistent=value_db.id_persistent,
        id_entity_persistent=value_db.id_entity_persistent,
        id_column_persistent=value_db.id_column_persistent,
        value=value_db.value,
        version=value_db.id,
        is_existing=value_db.is_existing,
        id_column_requested_persistent=value_db.id_column_requested_persistent,
    )
