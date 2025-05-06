"API endpoints for tag definitions."

from datetime import datetime
from typing import List
from uuid import uuid4

from django.db import DatabaseError, IntegrityError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.models_api import TagDefinitionResponse
from cosmae.column.models_conversion import (
    _tag_type_mapping_api_to_db,
    tag_definition_db_to_api,
)
from cosmae.column.models_django import Column as TagDefinitionDb
from cosmae.column.models_django import ColumnHistory as TagDefinitionHistoryDb
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


class TagDefinitionRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for a tag definition in a request."
    id_persistent: str | None = None
    id_parent_persistent: str | None = None
    name: str
    description: str | None = None
    version: int | None = None
    type: str
    owner: PublicUserInfo | None = None
    hidden: bool | None = None
    disabled: bool | None = None


class TagDefinitionRequestList(Schema):
    "API model for a list of request tag definition objects."

    # pylint: disable=too-few-public-methods
    tag_definitions: List[TagDefinitionRequest]


class TagDefinitionResponseList(Schema):
    "API model for a list of response tag definition objects."

    # pylint: disable=too-few-public-methods
    tag_definitions: List[TagDefinitionResponse]


class PostGetChildrenRequest(Schema):
    "API model for getting tag definitions by parent_id_persistent"

    # pylint: disable=too-few-public-methods
    id_parent_persistent: str | None = None


class CurationPostRequest(Schema):
    "Request for changing the curation state of a tag definition"

    # pylint: disable=too-few-public-methods
    id_persistent: bool
    is_curated: bool


class TagDefinitionDetailsRequest(Schema):
    "Request for getting details on tag definition"

    # pylint: disable=too-few-public-methods
    id_persistent_list: List[str]


class DescendantListResponse(Schema):
    "Response when requesting ancestors"

    # pylint: disable=too-few-public-methods
    id_descendants_persistent_list: List[str]


@router.post(
    "",
    response={
        200: TagDefinitionResponseList,
        400: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_tag_definitions(  # pylint: disable=too-many-branches
    request: HttpRequest, tag_definition_list: TagDefinitionRequestList
):
    "Add tag definitions."
    # pylint: disable=too-many-return-statements
    now = timestamp()
    tag_def_apis = tag_definition_list.tag_definitions
    try:
        user = check_user(request)
        tag_def_dbs = [
            tag_definition_api_to_db(tag_def, user, now) for tag_def in tag_def_apis
        ]
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    except ValidationException as exc:
        return 400, ApiError(msg=str(exc))
    except NoParentColumnException as exc:
        return 400, ApiError(
            msg=f"There is no tag definition with id_persistent {exc.id_persistent}."
        )
    except ColumnExistsException as exc:
        return 400, ApiError(
            msg="There is an existing tag definition with name "
            f"{exc.tag_name} and id_parent_persistent {exc.id_parent_persistent}. "
            f"Its id_persistent is {exc.id_persistent}."
        )
    except UnmodifiableFieldException as exc:
        return 400, ApiError(
            msg=f"Tried to change unmodifiable field {exc.field_name}."
        )
    except DbObjectExistsException as exc:
        return 500, ApiError(
            msg="Could not generate id_persistent for tag definition with name "
            f"{exc.values['name']}."
        )
    except EntityUpdatedException as exc:
        return 500, ApiError(
            msg="There has been a concurrent modification to the tag definition "
            f"with id_persistent {exc.new_value.id_persistent}."
        )
    except PermissionException:
        return 403, ApiError(msg="Insufficient permissions")
    except NoSelfParentColumnException:
        return 400, ApiError(msg="Can not set a tag definition as its own parent.")
    except NoChildColumnAllowedException:
        return 400, ApiError(msg="Only navigation tags are allowed to have children.")
    except DisabledColumnHasChildrenException:
        return 400, ApiError(msg="Can not delete tag definitions that have children")
    except KeyError as exc:
        return 400, ApiError(msg=f"Type {exc.args[0]} is not known.")

    try:
        with transaction.atomic():
            for tag_def, do_write in tag_def_dbs:
                if do_write:
                    tag_def.save()
                    update_column_name_path(tag_def.id_parent_persistent)
    except IntegrityError as exc:
        return 500, ApiError(msg="Provided data not consistent with database.")

    return 200, TagDefinitionResponseList(
        tag_definitions=[
            tag_definition_db_to_api(tag_def) for tag_def, _ in tag_def_dbs
        ]
    )


@router.post(
    "/details",
    response={
        200: TagDefinitionResponseList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
    },
)
def post_details(request: HttpRequest, body: TagDefinitionDetailsRequest):
    "Get details on tag definitions."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        if len(body.id_persistent_list) > 1000:
            return 400, ApiError(msg="Requested too many tag definition.")
        tag_definitions_db = TagDefinitionDb.objects.filter(
            id_persistent__in=body.id_persistent_list
        )
        tag_definitions_api = [
            tag_definition_db_to_api(tag_def) for tag_def in tag_definitions_db
        ]
        return 200, TagDefinitionResponseList(tag_definitions=tag_definitions_api)
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get tag definitions.")


@router.post(
    "/children",
    response={
        200: TagDefinitionResponseList,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_get_tag_definition_children(
    request: HttpRequest, post_children_request: PostGetChildrenRequest
):
    "Get tag definitions by id_parent_persistent."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        child_definitions_db = list(
            TagDefinitionDb.children_query_set(
                post_children_request.id_parent_persistent, user
            )
        )
        return 200, TagDefinitionResponseList(
            tag_definitions=[
                tag_definition_db_to_api(tag_def) for tag_def in child_definitions_db
            ]
        )
    except DatabaseError:
        return 500, ApiError(msg="Database Error.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get children tag definitions.")


@router.delete(
    "{id_persistent}",
    response={200: None, 401: ApiError, 403: ApiError, 404: ApiError, 500: ApiError},
)
def purge(request: HttpRequest, id_persistent: str):
    "Remove a tag definition from the history."
    try:
        user = check_user(request)
        if user.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="Insufficient permissions")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        tag_def_history_queryset = TagDefinitionHistoryDb.objects.filter(
            id_persistent=id_persistent
        ).order_by("-time_edit")
        if len(tag_def_history_queryset) == 0:
            return 404, ApiError(msg="Tag definition not found")
        most_recent = tag_def_history_queryset[0]
        if not most_recent.is_owner(user.id_persistent):
            return 403, ApiError(msg="Insufficient permissions")
        with transaction.atomic():
            TagDefinitionHistoryDb.bypass_parent(id_persistent)
            for tag_def in tag_def_history_queryset:
                tag_def.delete()
        return 200, None
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not delete tag definition history")


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
def get_descendants(request: HttpRequest, id_persistent: str):
    "API method for getting all descendants of a tag that may contain data."
    try:
        user = check_user(request)
        if user.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="insufficient_permissions")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    try:
        descendant_id_list = TagDefinitionDb.descendants(id_persistent, user)
        return DescendantListResponse(id_descendants_persistent_list=descendant_id_list)
    except TagDefinitionDb.DoesNotExist:
        return 404, ApiError(msg="Tag definition does not exist")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get descendants")


def tag_definition_api_to_db(
    tag_definition: TagDefinitionRequest, requester: CosmaeUser, time_edit: datetime
) -> TagDefinitionDb:
    "Convert a tag definition from API to database model."
    additional_values = {}
    if tag_definition.id_persistent:
        persistent_id = tag_definition.id_persistent
        if tag_definition.version is None:
            raise ValidationException(
                f"Tag definition with id_persistent {tag_definition.id_persistent} "
                "has no previous version."
            )
    else:
        if tag_definition.version:
            raise ValidationException(
                f"Tag definition with name {tag_definition.name} "
                "has version but no id_persistent."
            )
        # new tag definition.
        additional_values["owner_id"] = requester.id
        persistent_id = str(uuid4())
    return TagDefinitionHistoryDb.change_or_create_versioned(
        id_persistent=persistent_id,
        id_parent_persistent=tag_definition.id_parent_persistent,
        version=tag_definition.version,
        time_edit=time_edit,
        name=tag_definition.name,
        description=tag_definition.description,
        type=_tag_type_mapping_api_to_db[tag_definition.type],
        written_by_session=requester.edit_session,
        hidden=tag_definition.hidden or False,
        disabled=tag_definition.disabled or False,
        **additional_values,
    )
