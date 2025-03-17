"Model conversions for tags."

from cosmae.tag.api.models_api import TagDefinitionResponse, TagInstancePost
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.tag.models_django import TagInstanceAbstract as TagInstanceAbstractDb
from cosmae.tag.queue import (
    get_tag_definition_name_path,
    get_tag_definition_name_path_from_parts,
)
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
        name_path=get_tag_definition_name_path_from_parts(id_persistent, name),
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
        name_path=get_tag_definition_name_path(tag_definition),
        version=tag_definition.id,
        type=_tag_type_mapping_db_to_api[tag_definition.type],
        owner=username,
        curated=tag_definition.curated,
        hidden=tag_definition.hidden,
        disabled=tag_definition.disabled,
    )


_tag_type_mapping_api_to_db = {
    "BOOL": TagDefinitionDb.BOOL,
    "INNER": TagDefinitionDb.INNER,
    "FLOAT": TagDefinitionDb.FLOAT,
    "STRING": TagDefinitionDb.STRING,
}


def tag_instance_db_to_api(tag_db: TagInstanceAbstractDb) -> TagInstancePost:
    "Convert tag instances from database to API representation."
    return TagInstancePost(
        id_persistent=tag_db.id_persistent,
        id_entity_persistent=tag_db.id_entity_persistent,
        id_tag_definition_persistent=tag_db.id_tag_definition_persistent,
        value=tag_db.value,
        version=tag_db.id,
    )
