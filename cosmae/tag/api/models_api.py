"Models for tag API"
from typing import List

from ninja import Schema

from cosmae.user.models_api.public import PublicUserInfo


class TagDefinitionResponse(Schema):
    "API model for a tag definition as a response object."
    # pylint: disable=too-few-public-methods
    id_persistent: str | None = None
    id_parent_persistent: str | None = None
    name: str
    description: str | None = None
    name_path: List[str]
    version: int
    type: str
    owner: PublicUserInfo | None = None
    curated: bool
    hidden: bool
    disabled: bool


class TagInstancePost(Schema):
    # pylint: disable=too-few-public-methods
    "A single API tag instance for post requests."
    id_entity_persistent: str
    id_tag_definition_persistent: str
    value: str | None = None
    id_persistent: str | None = None
    version: int | None = None
