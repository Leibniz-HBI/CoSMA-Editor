"API endpoints for handling user management."
from typing import List, Union

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import AnonymousUser, Group
from django.db import IntegrityError
from ninja import Router, Schema
from ninja.constants import NOT_SET
from pydantic import Field

from cosmae.exception import ApiError
from cosmae.tag.api.definitions import TagDefinition
from cosmae.util import EmptyResponse, CosmaeUser
from cosmae.util.auth import CosmaeGroup, cosmae_auth


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
    user_name: str
    names_personal: str
    names_family: str
    email: str
    columns: List[TagDefinition]


class RegisterRequest(Schema):
    "API model for register requests."
    user_name: str = Field(None, min_length=2, max_length=150)
    names_personal: str = Field(None, min_length=2, max_length=150)
    names_family: str = Field(None, min_length=2, max_length=150)
    email: str = Field(None, min_length=2, max_length=150)
    password: str = Field(None, min_length=8, max_length=50)

    def __str__(self) -> str:
        as_dict = super().dict()
        as_dict.pop("password")
        return str(as_dict)


router = Router()


@router.post("login", auth=NOT_SET, response={200: Union[LoginResponse, ApiError]})
def login_post(request, credentials: LoginRequest):
    "API endpoint for login"
    user = authenticate(
        request, username=credentials.name, password=credentials.password
    )
    if user is None:
        return 200, ApiError(msg="Invalid credentials.")
    login(request, user)
    return 200, user_db_to_login_response(user)


@router.post("logout", auth=cosmae_auth)
def logout_post(request):
    "API endpoint for logout"
    logout(request)


@router.get("refresh", response={200: LoginResponse, 401: EmptyResponse})
def refresh_get(request):
    "Endpoint for refreshing a session."
    user = request.user
    if isinstance(user, AnonymousUser):
        return 401, EmptyResponse
    return 200, user_db_to_login_response(user)


@router.post(
    "register",
    auth=NOT_SET,
    response={200: LoginResponse, 500: ApiError, 400: ApiError},
)
def register_post(_, registration_info: RegisterRequest):
    "API endpoint for registration"
    try:
        user = CosmaeUser.objects.create_user(
            username=registration_info.user_name,
            email=registration_info.email,
            password=registration_info.password,
            first_name=registration_info.names_personal,
        )
        if user.last_name and user.last_name != "":
            user.last_name = registration_info.names_family
        user.groups.set([Group.objects.get(name=str(CosmaeGroup.APPLICANT))])
        user.save()
        return 200, user_db_to_login_response(user)
    except IntegrityError as exc:
        if str(exc.args[0]).startswith("UNIQUE"):
            return 400, ApiError(msg="Username or mail adress already in use.")
        return 500, ApiError(msg="Could not create user.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not create user.")


def user_db_to_login_response(user):
    "Converts a django user to a login response."
    return LoginResponse(
        user_name=user.get_username(),
        names_personal=user.first_name,
        names_family=user.last_name,
        email=user.email,
        columns=[],
    )
