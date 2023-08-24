# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.api.integration.requests as req
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Test the correct response when user can not be authenticated."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.user.api.check_user", mock):
        rsp = req.get_user_chunk(server.url, 0, 1, cookies=cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Test the correct response for missing user data in request"
    server, _ = auth_server
    rsp = req.get_user_chunk(server.url, 0, 1)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server):
    """Test if a change permission group request is denied,
    when the requesting user has insufficient permissions."""
    server, cookies = auth_server
    rsp = req.get_user_chunk(server.url, 0, 1, cookies=cookies)
    assert rsp.status_code == 403


def test_exceed_max_chunk_size(auth_server_commissioner):
    """Test whether a large chunk results in a bad request response."""
    server, cookies = auth_server_commissioner
    rsp = req.get_user_chunk(server.url, 0, 5001, cookies=cookies)
    assert rsp.status_code == 400


def test_can_chunk(auth_server_commissioner, user, user1):
    """Test if the get user call works correctly"""
    server, cookies = auth_server_commissioner
    rsp = req.get_user_chunk(server.url, 0, 2, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    user_list = json["user_list"]
    assert len(user_list) == 2
    next_offset = json["next_offset"]
    rsp = req.get_user_chunk(server.url, next_offset, 2, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    user_list = json["user_list"]
    assert len(user_list) == 1
    next_offset = json["next_offset"]
    rsp = req.get_user_chunk(server.url, next_offset, 2, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    user_list = json["user_list"]
    assert len(user_list) == 0


def test_excludes_super_user(auth_server_commissioner, super_user):
    """Test whether super user accounts are excluded."""
    server, cookies = auth_server_commissioner
    rsp = req.get_user_chunk(server.url, 0, 2, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    user_list = json["user_list"]
    assert len(user_list) == 1
