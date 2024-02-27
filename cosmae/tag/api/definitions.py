"API endpoints for tag definitions."

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from django.db import DatabaseError, IntegrityError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import (
    ApiError,
    DbObjectExistsException,
    EntityUpdatedException,
    NoParentTagException,
    NoSelfParentTagException,
    NotAuthenticatedException,
    PermissionException,
    TagDefinitionExistsException,
    ValidationException,
)
from cosmae.tag.api.models_api import TagDefinitionResponse
from cosmae.tag.api.models_conversion import (
    _tag_type_mapping_api_to_db,
    tag_definition_db_to_api,
)
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.tag.models_django import TagDefinitionHistory as TagDefinitionHistoryDb
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user

router = Router()


class TagDefinitionRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for a tag definition in a request."
    id_persistent: Optional[str]
    id_parent_persistent: Optional[str]
    name: str
    version: Optional[int]
    type: str
    owner: Optional[PublicUserInfo]
    hidden: Optional[bool]
    disabled: Optional[bool]


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
    id_parent_persistent: Optional[str]


class CurationPostRequest(Schema):
    "Request for changing the curation state of a tag definition"

    # pylint: disable=too-few-public-methods
    id_persistent: bool
    is_curated: bool


@router.post(
    "",
    response={
        200: TagDefinitionResponseList,
        400: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_tag_definitions(
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
    except NoParentTagException as exc:
        return 400, ApiError(
            msg=f"There is no tag definition with id_persistent {exc.id_persistent}."
        )
    except TagDefinitionExistsException as exc:
        return 400, ApiError(
            msg="There is an existing tag definition with name "
            f"{exc.tag_name} and id_parent_persistent {exc.id_parent_persistent}. "
            f"Its id_persistent is {exc.id_persistent}."
        )
    except DbObjectExistsException as exc:
        return 500, ApiError(
            msg=f"Could not generate id_persistent for tag definition with name {exc.display_txt}."
        )
    except EntityUpdatedException as exc:
        return 500, ApiError(
            msg="There has been a concurrent modification to the tag definition "
            f"with id_persistent {exc.new_value.id_persistent}."
        )
    except PermissionException:
        return 403, ApiError(msg="Insufficient permissions")
    except NoSelfParentTagException:
        return 400, ApiError(msg="Can not set a tag definition as its own parent.")
    except KeyError as exc:
        return 400, ApiError(msg=f"Type {exc.args[0]} is not known.")

    try:
        with transaction.atomic():
            for tag_def, do_write in tag_def_dbs:
                if do_write:
                    tag_def.save()
    except IntegrityError as exc:
        return 500, ApiError(msg="Provided data not consistent with database.")

    return 200, TagDefinitionResponseList(
        tag_definitions=[
            tag_definition_db_to_api(tag_def) for tag_def, _ in tag_def_dbs
        ]
    )


@router.post("/children", response={200: TagDefinitionResponseList, 500: ApiError})
def post_get_tag_definition_children(
    request: HttpRequest, post_children_request: PostGetChildrenRequest
):
    "Get tag definitions by id_parent_persistent."
    user = check_user(request)
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
    return TagDefinitionHistoryDb.change_or_create(
        id_persistent=persistent_id,
        id_parent_persistent=tag_definition.id_parent_persistent,
        version=tag_definition.version,
        time_edit=time_edit,
        name=tag_definition.name,
        type=_tag_type_mapping_api_to_db[tag_definition.type],
        requester=requester,
        hidden=tag_definition.hidden or False,
        disabled=tag_definition.disabled or False,
        **additional_values,
    )
