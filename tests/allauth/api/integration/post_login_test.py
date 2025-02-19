# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,duplicate-code,unused-argument
import tests.user.common as c
from tests.allauth.api.integration.requests import get_config, post_login
from tests.utils import assert_versioned


def test_invalid_credentials(live_server, user):
    rsp = get_config(live_server.url)
    assert rsp.status_code == 200
    rsp = post_login(live_server.url, c.test_username, "incorrect", cookies=rsp.cookies)
    assert rsp.status_code == 400
    assert rsp.json() == {
        "status": 400,
        "errors": [
            {
                "code": "username_password_mismatch",
                "message": "The username and/or password you specified are not "
                "correct.",
                "param": "password",
            }
        ],
    }


def test_valid_credentials(live_server, user):
    rsp = get_config(live_server.url)
    rsp = post_login(
        live_server.url, c.test_username, c.test_password, cookies=rsp.cookies
    )
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
