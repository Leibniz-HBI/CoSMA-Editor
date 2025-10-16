"API endpoints for columns."

from datetime import datetime
from logging import getLogger
from typing import List
from uuid import uuid4
from venv import logger

from django.db import DatabaseError, IntegrityError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.models_api import ColumnResponse
from cosmae.column.models_conversion import (
    column_db_to_api,
    column_type_mapping_api_to_db,
)
from cosmae.column.models_django import Column as ColumnDb
from cosmae.column.models_django import ColumnHistory as ColumnHistoryDb
from cosmae.column.models_django import column_objects
from cosmae.column.queue import update_column_name_path
from cosmae.exception import (
    ApiError,
    ColumnExistsException,
    DbObjectExistsException,
    DisabledColumnHasChildrenException,
    EntityUpdatedException,
    NoChildColumnAllowedException,
    NoParentColumnException,
    NoSelfParentColumnException,
    NotAuthenticatedException,
    PermissionException,
    UnmodifiableFieldException,
    ValidationException,
)
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user

router = Router()
logger = getLogger(__name__)


class ColumnRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for a column in a request."
    id_persistent: str | None = None
    id_parent_persistent: str | None = None
    name: str
    description: str | None = None
    version: int | None = None
    type: str
    owner: PublicUserInfo | None = None
    hidden: bool | None = None
    disabled: bool | None = None


class ColumnRequestList(Schema):
    "API model for a list of request column objects."

    # pylint: disable=too-few-public-methods
    column_list: List[ColumnRequest]


class ColumnResponseList(Schema):
    "API model for a list of response column objects."

    # pylint: disable=too-few-public-methods
    column_list: List[ColumnResponse]


class PostGetChildrenRequest(Schema):
    "API model for getting columns by parent_id_persistent"

    # pylint: disable=too-few-public-methods
    id_parent_persistent: str | None = None
    up_until_time: datetime | None = None


class CurationPostRequest(Schema):
    "Request for changing the curation state of a column"

    # pylint: disable=too-few-public-methods
    id_persistent: bool
    is_curated: bool


class ColumnDefinitionDetailsRequest(Schema):
    "Request for getting details on column"

    # pylint: disable=too-few-public-methods
    id_persistent_list: List[str]
    up_until_time: datetime | None = None


class DescendantListResponse(Schema):
    "Response when requesting ancestors"

    # pylint: disable=too-few-public-methods
    id_descendants_persistent_list: List[str]


class IdPersistentList(Schema):
    "API model for a list of persistent Ids"

    id_persistent_list: List[str]


@router.post(
    "",
    response={
        200: ColumnResponseList,
        400: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_columns(  # pylint: disable=too-many-branches
    request: HttpRequest, column_list: ColumnRequestList
):
    "Add columns."
    # pylint: disable=too-many-return-statements
    now = timestamp()
    column_api_list = column_list.column_list
    try:
        user = check_user(request)
        column_def_db_list = [
            column_api_to_db(column, user, now) for column in column_api_list
        ]
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except ValidationException as exc:
        return 400, ApiError(msg=str(exc))
    except NoParentColumnException as exc:
        return 400, ApiError(
            msg=f"There is no column with id_persistent {exc.id_persistent}."
        )
    except ColumnExistsException as exc:
        return 400, ApiError(
            msg="There is an existing column with name "
            f"{exc.column_name} and id_parent_persistent {exc.id_parent_persistent}. "
            f"Its id_persistent is {exc.id_persistent}."
        )
    except UnmodifiableFieldException as exc:
        return 400, ApiError(
            msg=f"Tried to change unmodifiable field {exc.field_name}."
        )
    except DbObjectExistsException as exc:
        return 500, ApiError(
            msg="Could not generate id_persistent for column with name "
            f"{exc.values['name']}."
        )
    except EntityUpdatedException as exc:
        return 500, ApiError(
            msg="There has been a concurrent modification to the column "
            f"with id_persistent {exc.new_value.id_persistent}."
        )
    except PermissionException:
        return 403, ApiError(msg="Insufficient permissions")
    except NoSelfParentColumnException:
        return 400, ApiError(msg="Can not set a column as its own parent.")
    except NoChildColumnAllowedException:
        return 400, ApiError(
            msg="Only navigation columns are allowed to have children."
        )
    except DisabledColumnHasChildrenException:
        return 400, ApiError(msg="Can not delete columns that have children")
    except KeyError as exc:
        return 400, ApiError(msg=f"Type {exc.args[0]} is not known.")

    try:
        with transaction.atomic():
            for column, do_write in column_def_db_list:
                if do_write:
                    column.save()
                    update_column_name_path(column.id)
    except IntegrityError as exc:
        return 500, ApiError(msg="Provided data not consistent with database.")

    return 200, ColumnResponseList(
        column_list=[column_db_to_api(column, now) for column, _ in column_def_db_list]
    )


@router.get(
    "/search",
    response={
        200: IdPersistentList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get_search(request: HttpRequest, term: str, up_until_time: datetime | None = None):
    "API method for searching columns."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient Permissions")
    try:
        column_db_list = column_objects(up_until_time).search(term)[:10]
        column_id_persistent_list = list(
            column_db_list.values_list("id_persistent", flat=True)
        )
        return 200, IdPersistentList(id_persistent_list=column_id_persistent_list)
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception(
            "Error while searching column with term '%s'", term, exc_info=exc
        )
        return 500, ApiError(msg="Could not search columns.")


@router.post(
    "/details",
    response={
        200: ColumnResponseList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_details(request: HttpRequest, body: ColumnDefinitionDetailsRequest):
    "Get details on columns."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        if len(body.id_persistent_list) > 1000:
            return 400, ApiError(msg="Requested too many column.")
        column_db_queryset = column_objects(body.up_until_time).filter(
            id_persistent__in=body.id_persistent_list
        )
        column_api_list = [
            column_db_to_api(column, up_until_time=body.up_until_time)
            for column in column_db_queryset
        ]
        return 200, ColumnResponseList(column_list=column_api_list)
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Error while getting column details", exc_info=exc)
        return 500, ApiError(msg="Could not get columns.")


@router.post(
    "/children",
    response={
        200: ColumnResponseList,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_get_column_children(
    request: HttpRequest, post_children_request: PostGetChildrenRequest
):
    "Get columns by id_parent_persistent."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        child_definitions_db = list(
            column_objects(post_children_request.up_until_time)
            .children(post_children_request.id_parent_persistent, user)
            .order_by("-curated")
        )
        return 200, ColumnResponseList(
            column_list=[
                column_db_to_api(
                    column, up_until_time=post_children_request.up_until_time
                )
                for column in child_definitions_db
            ]
        )
    except DatabaseError:
        return 500, ApiError(msg="Database Error.")
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Could not get children columns", exc_info=exc)
        return 500, ApiError(msg="Could not get children columns.")


@router.delete(
    "{id_persistent}",
    response={200: None, 401: ApiError, 403: ApiError, 404: ApiError, 500: ApiError},
)
def purge(request: HttpRequest, id_persistent: str):
    "Remove a column from the history."
    try:
        user = check_user(request)
        if user.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="Insufficient permissions")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        column_history_queryset = ColumnHistoryDb.objects.filter(
            id_persistent=id_persistent
        ).order_by("-time_edit")
        if len(column_history_queryset) == 0:
            return 404, ApiError(msg="Column not found")
        most_recent = column_history_queryset[0]
        if not most_recent.is_owner(user.id_persistent):
            return 403, ApiError(msg="Insufficient permissions")
        with transaction.atomic():
            ColumnHistoryDb.bypass_parent(id_persistent)
            for column in column_history_queryset:
                column.delete()
        return 200, None
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not delete column history")


@router.get(
    "{id_persistent}/descendants",
    response={
        200: DescendantListResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get_descendants(
    request: HttpRequest, id_persistent: str, up_until_time: datetime | None = None
):
    "API method for getting all descendants of a column that may contain data."
    try:
        user = check_user(request)
        if user.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="insufficient_permissions")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    try:
        descendant_id_list = ColumnDb.descendants(id_persistent, user, up_until_time)
        return DescendantListResponse(id_descendants_persistent_list=descendant_id_list)
    except ColumnDb.DoesNotExist:
        return 404, ApiError(msg="Column does not exist")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get descendants")


def column_api_to_db(
    column: ColumnRequest, requester: CosmaeUser, time_edit: datetime
) -> ColumnDb:
    "Convert a column from API to database model."
    additional_values = {}
    if column.id_persistent:
        persistent_id = column.id_persistent
        if column.version is None:
            raise ValidationException(
                f"Column with id_persistent {column.id_persistent} "
                "has no previous version."
            )
    else:
        if column.version:
            raise ValidationException(
                f"Column with name {column.name} " "has version but no id_persistent."
            )
        # new column.
        additional_values["owner_id"] = requester.id
        persistent_id = str(uuid4())
    return ColumnHistoryDb.change_or_create_versioned(
        id_persistent=persistent_id,
        id_parent_persistent=column.id_parent_persistent,
        version=column.version,
        time_edit=time_edit,
        name=column.name,
        description=column.description,
        type=column_type_mapping_api_to_db[column.type],
        written_by_session=requester.edit_session,
        hidden=column.hidden or False,
        disabled=column.disabled or False,
        **additional_values,
    )
