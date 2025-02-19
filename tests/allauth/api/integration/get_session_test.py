# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,duplicate-code
import tests.user.common as c
from tests.allauth.api.integration.requests import get_session
from tests.utils import assert_versioned


def test_not_logged_in(auth_server):
    live_server, _ = auth_server
    rsp = get_session(live_server.url, None)
    assert rsp.status_code == 401


def test_logged_in(auth_server):
    live_server, cookies = auth_server
    rsp = get_session(live_server.url, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json["status"] == 200
    assert json["meta"] == {"is_authenticated": True}
    data = json["data"]
    assert_versioned(
        data["user"],
        {
            "display": c.test_username,
            "email": c.test_email,
            "username": c.test_username,
            "has_usable_password": True,
        },
        version_key="id",
    )
    assert_versioned(
        data["methods"],
        [{"method": "password", "username": c.test_username}],
        version_key="at",
    )
