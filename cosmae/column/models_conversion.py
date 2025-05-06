"Model conversions for columns."

from cosmae.column.models_api import TagDefinitionResponse
from cosmae.column.models_django import Column as TagDefinitionDb
from cosmae.column.queue import get_column_name_path, get_column_name_path_from_parts
from cosmae.user.model_conversion.public import (
    permission_group_db_to_api,
    user_db_to_public_user_info,
)

_tag_type_mapping_db_to_api = {
    TagDefinitionDb.BOOL: "BOOL",
    TagDefinitionDb.INNER: "INNER",
    TagDefinitionDb.FLOAT: "FLOAT",
    TagDefinitionDb.STRING: "STRING",
}

_tag_type_mapping_api_to_db = {
    "BOOL": TagDefinitionDb.BOOL,
    "INNER": TagDefinitionDb.INNER,
    "FLOAT": TagDefinitionDb.FLOAT,
    "STRING": TagDefinitionDb.STRING,
}


def tag_definition_db_dict_to_api(
    tag_definition: TagDefinitionDb,
) -> TagDefinitionResponse:
    "Convert a tag definition from database to API model."
    id_persistent = tag_definition["id_persistent"]
    name = tag_definition["name"]
    if tag_definition["owner"] is None or tag_definition["owner"]["username"] is None:
        owner = None
    else:
        owner = tag_definition["owner"]
        owner["permission_group"] = permission_group_db_to_api[
            owner["permission_group"]
        ]
    return TagDefinitionResponse(
        id_persistent=id_persistent,
        id_parent_persistent=tag_definition["id_parent_persistent"],
        name=name,
        description=tag_definition["description"],
        name_path=get_column_name_path_from_parts(id_persistent, name),
        version=tag_definition["id"],
        type=_tag_type_mapping_db_to_api[tag_definition["type"]],
        owner=owner,
        curated=tag_definition["curated"],
        hidden=tag_definition["hidden"],
        disabled=tag_definition["disabled"],
    )


def tag_definition_db_to_api(tag_definition: TagDefinitionDb) -> TagDefinitionResponse:
    "Convert a tag definition from database to API model."
    owner = tag_definition.owner
    if owner is None:
        username = None
    else:
        username = user_db_to_public_user_info(owner)
    return TagDefinitionResponse(
        id_persistent=tag_definition.id_persistent,
        id_parent_persistent=tag_definition.id_parent_persistent,
        name=tag_definition.name,
        description=tag_definition.description,
        name_path=get_column_name_path(tag_definition),
        version=tag_definition.id,
        type=_tag_type_mapping_db_to_api[tag_definition.type],
        owner=username,
        curated=tag_definition.curated,
        hidden=tag_definition.hidden,
        disabled=tag_definition.disabled,
    )
