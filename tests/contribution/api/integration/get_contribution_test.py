# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
from cosmae.util.auth import NotAuthenticatedException


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.contribution.api.check_user", mock):
        rsp = req_contrib.get_contribution(server.url, "id-test", cookies=cookies)
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req_contrib.get_contribution(server.url, "id-test")
    assert rsp.status_code == 401


def test_404(auth_server):
    server, cookies = auth_server
    rsp = req_contrib.get_contribution(server.url, str(uuid4()), cookies=cookies)
    assert rsp.status_code == 404


def test_get(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.get_contribution(
        live_server.url, id_persistent=id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["id_persistent"] == id_persistent
    contribution.pop("id_persistent")
    assert contribution == c.contribution_test_upload0
