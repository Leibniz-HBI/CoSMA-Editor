"Models for tag API"
from typing import List, Optional

from ninja import Schema


class TagDefinitionResponse(Schema):
    "API model for a tag definition as a response object."
    # pylint: disable=too-few-public-methods
    id_persistent: Optional[str]
    id_parent_persistent: Optional[str]
    name: str
    name_path: List[str]
    version: int
    type: str
    owner: Optional[str]
    curated: bool
