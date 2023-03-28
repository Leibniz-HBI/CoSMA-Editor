"API endpoints for tag definitions."
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from django.db import DatabaseError, IntegrityError
from ninja import Router, Schema

from cosmae.exception import (
    ApiError,
    DbObjectExistsException,
    EntityUpdatedException,
    NoChildTagDefintionsAllowedException,
    NoParentTagException,
    TagDefinitionExistsException,
    ValidationException,
)
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.util.django import save_many_atomic

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


class TagDefinition(Schema):
    "API model for a tag definition."
    # pylint: disable=too-few-public-methods
    id_persistent: Optional[str]
    id_parent_persistent: Optional[str]
    name: str
    version: Optional[int]
    type: str


class TagDefinitionList(Schema):
    "API model for a list of tag definitions."
    # pylint: disable=too-few-public-methods
    tag_definitions: List[TagDefinition]


class PostGetChildrenRequest(Schema):
    "API model for getting tag definitions by parent_id_persistent"
    # pylint: disable=too-few-public-methods
    id_parent_persistent: Optional[str]


@router.post("", response={200: TagDefinitionList, 400: ApiError, 500: ApiError})
def post_tag_definitions(_, tag_definition_list: TagDefinitionList):
    "Add tag definitions."
    # pylint: disable=too-many-return-statements
    now = datetime.utcnow()
    tag_def_apis = tag_definition_list.tag_definitions
    try:
        tag_def_dbs = [
            tag_definition_api_to_db(tag_def, now) for tag_def in tag_def_apis
        ]
    except ValidationException as exc:
        return 400, ApiError(msg=str(exc))
    except NoParentTagException as exc:
        return 400, ApiError(
            msg=f"There is no tag definition with id_persistent {exc.id_persistent}."
        )
    except NoChildTagDefintionsAllowedException as exc:
        return 400, ApiError(
            msg=f"Tag definition with id_persistent {exc.id_persistent} "
            "is not allowed to have child tags."
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

    tag_def_db_writes = [tag_def for tag_def, do_write in tag_def_dbs if do_write]
    try:
        save_many_atomic(tag_def_db_writes)
    except IntegrityError:
        return 500, ApiError(msg="Provided data not consistent with database.")

    return 200, TagDefinitionList(
        tag_definitions=[
            tag_definition_db_to_api(tag_def) for tag_def, _ in tag_def_dbs
        ]
    )


@router.post("/children", response={200: TagDefinitionList, 500: ApiError})
def post_get_tag_definition_children(_, post_children_request: PostGetChildrenRequest):
    "Get tag definitions by id_parent_persistent."
    try:
        child_definitions_db = list(
            TagDefinitionDb.most_recent_children(
                post_children_request.id_parent_persistent
            )
        )
        return 200, TagDefinitionList(
            tag_definitions=[
                tag_definition_db_to_api(tag_def) for tag_def in child_definitions_db
            ]
        )
    except DatabaseError:
        return 500, ApiError(msg="Database Error.")


def tag_definition_api_to_db(
    tag_definition: TagDefinition, time_edit: datetime
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
    )


def tag_definition_db_to_api(tag_definition: TagDefinitionDb) -> TagDefinition:
    "Convert a tag defintion from database to API model."
    return TagDefinition(
        id_persistent=tag_definition.id_persistent,
        id_parent_persistent=tag_definition.id_parent_persistent,
        name=tag_definition.name,
        version=tag_definition.id,
        type=_tag_type_mapping_db_to_api[tag_definition.type],
    )
