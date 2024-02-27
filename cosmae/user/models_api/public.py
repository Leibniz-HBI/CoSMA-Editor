"API models for public user information."
from ninja import Schema


class PublicUserInfo(Schema):
    # pylint: disable=too-few-public-methods
    "API model for public user information."
    username: str
    id_persistent: str
    permission_group: str
