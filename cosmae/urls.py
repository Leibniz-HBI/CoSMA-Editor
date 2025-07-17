"""Registry for CoSMA-Editor urls."""

import json
from datetime import datetime
from typing import cast

from django.contrib import admin
from django.contrib.auth import authenticate, login
from django.http import HttpRequest
from django.urls import path
from ninja import NinjaAPI, Schema
from ninja.constants import NOT_SET
from ninja.parser import Parser
from ninja.renderers import JSONRenderer
from ninja.responses import NinjaJSONEncoder
from ninja.types import DictStrAny

from cosmae.column.router import router as columns_router
from cosmae.comments.api import router as comment_router
from cosmae.contribution.api import router as contribution_router
from cosmae.edit_session.api import router as edit_session_router
from cosmae.entity.api import router as person_router
from cosmae.management import router as management_router
from cosmae.merge_request.router import router
from cosmae.permissions.api import router as permission_router
from cosmae.user.router import router as user_router
from cosmae.util.auth import cosmae_auth
from cosmae.value.api import router as values_router

DATE_FORMAT = "%Y-%m-%d %H:%M:%S %z"


class JsonEncoderWithDatetime(NinjaJSONEncoder):
    "JSON encoder for ninja API with custom datetime formatting."

    def default(self, o):
        if isinstance(o, datetime):
            return o.strftime(DATE_FORMAT)
        return super().default(o)


class JsonRendererWithDateTime(JSONRenderer):
    "JSON render that uses encoder with custom date time formatting."

    # pylint: disable=too-few-public-methods
    encoder_class = JsonEncoderWithDatetime


class JsonDecoder(json.JSONDecoder):
    "JSON decoder handling ISO 8601 date format"

    def __init__(self, *args, **kwargs):
        super().__init__(object_hook=self.object_hook_with_time_decode, *args, **kwargs)

    def object_hook_with_time_decode(self, obj):
        "try to parse dates, otherwise return the value."
        ret = {}
        for key, value in obj.items():
            if key in {"timestamp", "up_until_time"}:
                ret[key] = datetime.strptime(value, DATE_FORMAT)
            else:
                ret[key] = value
        return ret


class NinjaParserWithDateTime(Parser):
    "Custom parser that can handle date time format."

    def parse_body(self, request: HttpRequest) -> DictStrAny:
        return cast(DictStrAny, json.loads(request.body, cls=JsonDecoder))

    def parse_querydict(self, data, list_fields, request):
        result: DictStrAny = {}
        for key in data.keys():
            if key in list_fields:
                result[key] = [self.handle_date(key, val) for val in data.getlist(key)]
            else:
                result[key] = self.handle_date(key, data[key])
        return result

    def handle_date(self, key, value):
        "parse date values."
        if key in {"timestamp", "up_until_time"}:
            return datetime.strptime(value, DATE_FORMAT)
        return value


ninja_api = NinjaAPI(
    csrf=False,  # renderer=JsonRendererWithDateTime(), parser=NinjaParserWithDateTime()
)
ninja_api.add_router("user", user_router, auth=NOT_SET)
ninja_api.add_router("entities", person_router, auth=cosmae_auth)
ninja_api.add_router("columns", columns_router, auth=cosmae_auth)
ninja_api.add_router("contributions", contribution_router, auth=cosmae_auth)
ninja_api.add_router("merge_requests", router, auth=cosmae_auth)
ninja_api.add_router("manage", management_router, auth=cosmae_auth)
ninja_api.add_router("comments", comment_router, auth=cosmae_auth)
ninja_api.add_router("edit_sessions", edit_session_router, auth=cosmae_auth)
ninja_api.add_router("values", values_router, auth=cosmae_auth)
ninja_api.add_router("permissions", permission_router, auth=cosmae_auth)


class LoginRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for login requests"
    name: str
    password: str


@ninja_api.post("login", auth=NOT_SET)
def login_post(request, credentials: LoginRequest):
    "API endpoint for login"
    user = authenticate(
        request, username=credentials.name, password=credentials.password
    )
    if user is None:
        return
    login(request, user)


urlpatterns = [path("manage/", admin.site.urls), path("api/", ninja_api.urls)]
