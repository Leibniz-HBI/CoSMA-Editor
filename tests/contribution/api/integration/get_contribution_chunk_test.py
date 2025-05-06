# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
from unittest.mock import MagicMock, patch

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
import tests.user.common as cu
from cosmae.util.auth import NotAuthenticatedException


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.contribution.api.check_user", mock):
        rsp = req_contrib.get_chunk(server.url, 0, 100, cookies=cookies)
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req_contrib.get_chunk(server.url, 0, 100)
    assert rsp.status_code == 401


def test_empty_chunk(auth_server):
    server, cookies = auth_server
    rsp = req_contrib.get_chunk(server.url, 0, 100, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {"contributions": []}


def test_multiple(auth_server):
    server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.post_contribution(
        server.url, c.contribution_post1, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_chunk(server.url, 0, 100, cookies=cookies)
    assert rsp.status_code == 200
    contributions = rsp.json()["contributions"]
    assert len(contributions) == 2
    for contribution in contributions:
        contribution.pop("id_persistent")
        contribution.pop("match_column_list")
    assert contributions[0] == c.contribution_test_upload0
    assert contributions[1] == c.contribution_test_upload1


def test_multiple_users(auth_server1):
    server, cookies_user0, cookies_user1 = auth_server1
    rsp = req_contrib.post_contribution(
        server.url, c.contribution_post0, cookies=cookies_user0
    )
    assert rsp.status_code == 200
    rsp = req_contrib.post_contribution(
        server.url, c.contribution_post1, cookies=cookies_user1
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_chunk(server.url, 0, 100, cookies=cookies_user0)
    assert rsp.status_code == 200
    contributions = rsp.json()["contributions"]
    assert len(contributions) == 1
    contribution = contributions[0]
    contribution.pop("id_persistent")
    contribution.pop("match_column_list")
    assert contribution == c.contribution_test_upload0
    rsp = req_contrib.get_chunk(server.url, 0, 100, cookies=cookies_user1)
    assert rsp.status_code == 200
    contributions = rsp.json()["contributions"]
    assert len(contributions) == 1
    contribution = contributions[0]
    contribution.pop("id_persistent")
    contribution.pop("match_column_list")
    expected = c.contribution_test_upload1.copy()
    expected["author"] = cu.test_username1
    assert contribution == expected
