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
    NotAuthenticatedException,
    TagDefinitionExistsException,
    ValidationException,
)
from cosmae.tag.api.models_api import TagDefinitionResponse
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.tag.queue import (
    get_tag_definition_name_path,
    get_tag_definition_name_path_from_parts,
)
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user

router = Router()


_tag_type_mapping_api_to_db = {
    "INNER": TagDefinitionDb.INNER,
    "FLOAT": TagDefinitionDb.FLOAT,
    "STRING": TagDefinitionDb.STRING,
}

_tag_type_mapping_db_to_api = {
    TagDefinitionDb.INNER: "INNER",
    TagDefinitionDb.FLOAT: "FLOAT",
    TagDefinitionDb.STRING: "STRING",
}


class TagDefinitionRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for a tag definition in a request."
    id_persistent: Optional[str]
    id_parent_persistent: Optional[str]
    name: str
    version: Optional[int]
    type: str
    owner: Optional[str]


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
    "", response={200: TagDefinitionResponseList, 400: ApiError, 500: ApiError}
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
    except KeyError as exc:
        return 400, ApiError(msg=f"Type {exc.args[0]} is not known.")

    try:
        with transaction.atomic():
            for tag_def, do_write in tag_def_dbs:
                if do_write:
                    tag_def.save()
    except IntegrityError:
        return 500, ApiError(msg="Provided data not consistent with database.")

    return 200, TagDefinitionResponseList(
        tag_definitions=[
            tag_definition_db_to_api(tag_def) for tag_def, _ in tag_def_dbs
        ]
    )


@router.post("/children", response={200: TagDefinitionResponseList, 500: ApiError})
def post_get_tag_definition_children(_, post_children_request: PostGetChildrenRequest):
    "Get tag definitions by id_parent_persistent."
    try:
        child_definitions_db = list(
            TagDefinitionDb.most_recent_children(
                post_children_request.id_parent_persistent
            )
        )
        return 200, TagDefinitionResponseList(
            tag_definitions=[
                tag_definition_db_to_api(tag_def) for tag_def in child_definitions_db
            ]
        )
    except DatabaseError:
        return 500, ApiError(msg="Database Error.")


def tag_definition_api_to_db(
    tag_definition: TagDefinitionRequest, owner: CosmaeUser, time_edit: datetime
) -> TagDefinitionDb:
    "Convert a tag definition from API to database model."
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
        persistent_id = str(uuid4())
    return TagDefinitionDb.change_or_create(
        id_persistent=persistent_id,
        id_parent_persistent=tag_definition.id_parent_persistent,
        version=tag_definition.version,
        time_edit=time_edit,
        name=tag_definition.name,
        type=_tag_type_mapping_api_to_db[tag_definition.type],
        owner=owner,
    )


def tag_definition_db_to_api(tag_definition: TagDefinitionDb) -> TagDefinitionResponse:
    "Convert a tag definition from database to API model."
    owner = tag_definition.owner
    if owner is None:
        username = None
    else:
        username = owner.get_username()
    return TagDefinitionResponse(
        id_persistent=tag_definition.id_persistent,
        id_parent_persistent=tag_definition.id_parent_persistent,
        name=tag_definition.name,
        name_path=get_tag_definition_name_path(tag_definition),
        version=tag_definition.id,
        type=_tag_type_mapping_db_to_api[tag_definition.type],
        owner=username,
        curated=tag_definition.curated,
    )


def tag_definition_db_dict_to_api(
    tag_definition: TagDefinitionDb,
) -> TagDefinitionResponse:
    "Convert a tag definition from database to API model."
    id_persistent = tag_definition["id_persistent"]
    name = tag_definition["name"]
    owner = tag_definition["owner"]["username"]
    return TagDefinitionResponse(
        id_persistent=id_persistent,
        id_parent_persistent=tag_definition["id_parent_persistent"],
        name=name,
        name_path=get_tag_definition_name_path_from_parts(id_persistent, name),
        version=tag_definition["id"],
        type=_tag_type_mapping_db_to_api[tag_definition["type"]],
        owner=owner,
        curated=tag_definition["curated"],
    )
