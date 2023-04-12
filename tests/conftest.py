# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import pytest

from tests.entity import common as ce
from tests.user import common as cu
from tests.user.api.integration.requests import post_login, post_register
from cosmae.entity.models_django import Entity


@pytest.fixture
def entity0():
    return Entity(id_persistent=ce.id_persistent_test_0, time_edit=ce.time_edit_test_0)


@pytest.fixture
def auth_server(live_server):
    rsp = post_register(
        live_server.url,
        {
            "user_name": cu.test_username,
            "password": cu.test_password,
            "email": cu.test_email,
            "names_personal": cu.test_names_personal,
        },
    )
    rsp = post_login(
        live_server.url, {"name": cu.test_username, "password": cu.test_password}
    )
    return live_server, rsp.cookies
