"API models for public user information."

from typing import Literal

from ninja import Schema

from cosmae.util import CosmaeUser


class PublicUserInfo(Schema):
    # pylint: disable=too-few-public-methods
    "API model for public user information."
    username: str
    id_persistent: str
    permission_group: Literal[
        "APPLICANT", "READER", "CONTRIBUTOR", "EDITOR", "COMMISSIONER"
    ]


permission_group_api_to_db = {
    "APPLICANT": CosmaeUser.APPLICANT,
    "READER": CosmaeUser.READER,
    "CONTRIBUTOR": CosmaeUser.CONTRIBUTOR,
    "EDITOR": CosmaeUser.EDITOR,
    "COMMISSIONER": CosmaeUser.COMMISSIONER,
}
