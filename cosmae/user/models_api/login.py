"API models for login and registration."
from typing import List, Union

from ninja import Schema
from pydantic import Field

from cosmae.tag.api.models_api import TagDefinitionResponse
from cosmae.user.models_api.public import PublicUserInfo


class LoginRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for login requests"
    name: str
    password: str

    def __str__(self):
        return f"LoginRequest: {{'name': {self.name}}}"


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


class LoginResponseList(Schema):
    # pylint: disable=too-few-public-methods
    "API model for multiple complete user infos."
    user_list: List[LoginResponse]
    next_offset: int


class RegisterRequest(Schema):
    "API model for register requests."
    username: str = Field(None, min_length=2, max_length=150)
    names_personal: str = Field(None, min_length=2, max_length=150)
    names_family: str | None = Field(None, min_length=2, max_length=150)
    email: str = Field(None, min_length=2, max_length=150)
    password: str = Field(None, min_length=8, max_length=50)

    def __str__(self) -> str:
        as_dict = super().dict()
        as_dict.pop("password")
        return str(as_dict)


class SearchResponse(Schema):
    "API model for user search results response"
    # pylint: disable=too-few-public-methods
    results: Union[List[LoginResponse], List[PublicUserInfo]]
    contains_complete_info: bool
