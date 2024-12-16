"API models for login and registration."

from typing import List, Union

from ninja import Schema

from cosmae.edit_session.api import EditSession
from cosmae.tag.api.models_api import TagDefinitionResponse
from cosmae.user.models_api.public import PublicUserInfo


class LoginResponse(Schema):
    # pylint: disable=too-few-public-methods
    "API model for response to login requests"
    username: str
    id_persistent: str
    names_personal: str
    names_family: str
    email: str
    tag_definition_list: List[TagDefinitionResponse]
    permission_group: str
    edit_session: EditSession


class LoginResponseList(Schema):
    # pylint: disable=too-few-public-methods
    "API model for multiple complete user infos."
    user_list: List[LoginResponse]
    next_offset: int


class SearchResponse(Schema):
    "API model for user search results response"

    # pylint: disable=too-few-public-methods
    results: Union[List[LoginResponse], List[PublicUserInfo]]
    contains_complete_info: bool
