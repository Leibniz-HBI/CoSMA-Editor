"API models for login and registration."

from typing import List, Optional, Union

from ninja import Schema
from pydantic import Field

from cosmae.edit_session.api import EditSession
from cosmae.user.models_api.public import PublicUserInfo


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


class LoginResponse(Schema):
    # pylint: disable=too-few-public-methods
    "API model for response to login requests"
    username: str
    id_persistent: str
    names_personal: str
    names_family: str
    email: str
    id_column_persistent_list: List[str]
    permission_group: str
    edit_session: EditSession
    password_changed: bool
    is_active: bool


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


class SetPasswordRequest(Schema):
    "API models for setting or changing passwords"

    id_user_persistent: Optional[str] = None
    old_password: Optional[str] = None
    new_password: str
