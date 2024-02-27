"Models for tag API"
from typing import List, Optional

from ninja import Schema

from cosmae.user.models_api.public import PublicUserInfo


class TagDefinitionResponse(Schema):
    "API model for a tag definition as a response object."
    # pylint: disable=too-few-public-methods
    id_persistent: Optional[str]
    id_parent_persistent: Optional[str]
    name: str
    name_path: List[str]
    version: int
    type: str
    owner: Optional[PublicUserInfo]
    curated: bool
    hidden: bool
    disabled: bool
