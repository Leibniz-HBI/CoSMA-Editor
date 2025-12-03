"API models for Columns"

from typing import List

from ninja import Schema

from cosmae.user.models_api.public import PublicUserInfo


class ColumnResponse(Schema):
    "API model for a column as a response object."

    # pylint: disable=too-few-public-methods
    id_persistent: str
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
