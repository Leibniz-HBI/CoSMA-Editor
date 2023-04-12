# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import tests.user.common as c
from tests.user.api.integration.requests import get_refresh


def test_not_logged_in(auth_server):
    live_server, _ = auth_server
    rsp = get_refresh(live_server.url, None)
    assert rsp.status_code == 401


def test_logged_in(auth_server):
    live_server, cookies = auth_server
    rsp = get_refresh(live_server.url, cookies=cookies)
    assert rsp.status_code == 200
    assert rsp.json() == {
        "user_name": c.test_username,
        "names_personal": c.test_names_personal,
        "email": c.test_email,
        "names_family": "",
    }
