"""Registry for CoSMA-Editor urls."""

from datetime import datetime

from django.contrib import admin
from django.contrib.auth import authenticate, login
from django.urls import path
from ninja import NinjaAPI, Schema
from ninja.constants import NOT_SET
from ninja.renderers import JSONRenderer
from ninja.responses import NinjaJSONEncoder

from cosmae.comments.api import router as comment_router
from cosmae.contribution.api import router as contribution_router
from cosmae.edit_session.api import router as edit_session_router
from cosmae.entity.api import router as person_router
from cosmae.management import router as management_router
from cosmae.merge_request.router import router
from cosmae.permissions.api import router as permission_router
from cosmae.tag.api.router import router as tag_router
from cosmae.user.api import router as user_router
from cosmae.util.auth import cosmae_auth


class JsonEncoderWithDatetime(NinjaJSONEncoder):
    "JSON encoder for ninja API with custom datetime formatting."

    def default(self, o):
        if isinstance(o, datetime):
            return o.strftime("%Y-%m-%d %H:%M:%S %z")
        return super().default(o)


class JsonRendererWithDateTime(JSONRenderer):
    "JSON render that uses encoder with custom date time formatting."

    # pylint: disable=too-few-public-methods
    encoder_class = JsonEncoderWithDatetime


ninja_api = NinjaAPI(csrf=False, renderer=JsonRendererWithDateTime())
ninja_api.add_router("user", user_router, auth=NOT_SET)
ninja_api.add_router("entities", person_router, auth=cosmae_auth)
ninja_api.add_router("tags", tag_router, auth=cosmae_auth)
ninja_api.add_router("contributions", contribution_router, auth=cosmae_auth)
ninja_api.add_router("merge_requests", router, auth=cosmae_auth)
ninja_api.add_router("manage", management_router, auth=cosmae_auth)
ninja_api.add_router("comments", comment_router, auth=cosmae_auth)
ninja_api.add_router("edit_sessions", edit_session_router, auth=cosmae_auth)
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
