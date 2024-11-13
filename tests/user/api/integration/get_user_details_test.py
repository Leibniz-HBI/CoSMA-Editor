# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.api.integration.requests as req
import tests.user.common as c
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Test the correct response when user can not be authenticated."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.user.api.check_user", mock):
        rsp = req.get_details(server.url, c.test_uuid, cookies=cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Test the correct response for missing user data in request"
    server, _ = auth_server
    rsp = req.get_details(server.url, c.test_uuid)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    """Test if a change permission group request is denied,
    when the requesting user has insufficient permissions."""
    server, cookies = auth_server_applicant
    rsp = req.get_details(server.url, c.test_uuid, cookies=cookies)
    assert rsp.status_code == 403


def test_get_user(auth_server_commissioner, user):
    """Test if the get user call works correctly"""
    server, cookies = auth_server_commissioner
    rsp = req.get_details(server.url, c.test_uuid, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "id_persistent": c.test_uuid,
        "username": c.test_username,
        "permission_group": "CONTRIBUTOR",
    }
