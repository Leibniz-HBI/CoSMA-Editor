# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument

from unittest.mock import MagicMock, patch

from requests import get

import tests.contribution.api.common as c
import tests.contribution.api.requests as req_contrib
import tests.user.common as cu
from cosmae.util.auth import NotAuthenticatedException


def test_unknown_user(request_user):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.api.check_user", mock):
        status, _rsp = req_contrib.get_chunk(request_user, 0, 100)
        assert status == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = get(
        server.url + "/cosmae/api/contributions/chunk/0/100",
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_empty_chunk(request_user):
    status, rsp = req_contrib.get_chunk(request_user, 0, 100)
    assert status == 200
    json = rsp.dict()
    assert json == {"contributions": []}


def test_multiple(request_user):
    status, _rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    status, _rsp = req_contrib.post_contribution(request_user, c.contribution_post1)
    assert status == 200
    status, rsp = req_contrib.get_chunk(request_user, 0, 100)
    assert status == 200
    contributions = rsp.dict()["contributions"]
    assert len(contributions) == 2
    for contribution in contributions:
        contribution.pop("id_persistent")
        contribution.pop("match_column_list")
    assert contributions[0] == c.contribution_test_upload0
    assert contributions[1] == c.contribution_test_upload1


def test_multiple_users(request_user, request_user1):
    status, _rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    status, _rsp = req_contrib.post_contribution(request_user1, c.contribution_post1)
    assert status == 200
    status, rsp = req_contrib.get_chunk(request_user, 0, 100)
    assert status == 200
    contributions = rsp.dict()["contributions"]
    assert len(contributions) == 1
    contribution = contributions[0]
    contribution.pop("id_persistent")
    contribution.pop("match_column_list")
    assert contribution == c.contribution_test_upload0
    status, rsp = req_contrib.get_chunk(request_user1, 0, 100)
    assert status == 200
    contributions = rsp.dict()["contributions"]
    assert len(contributions) == 1
    contribution = contributions[0]
    contribution.pop("id_persistent")
    contribution.pop("match_column_list")
    expected = c.contribution_test_upload1.copy()
    expected["author"] = cu.test_username1
    assert contribution == expected
