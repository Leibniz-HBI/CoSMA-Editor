# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.edit_session.common as ce
import tests.user.api.integration.requests as req
import tests.user.common as cu
from cosmae.exception import NotAuthenticatedException
from cosmae.util import CosmaeUser


def test_unknown_user(auth_server):
    "Test response, when user can not be authenticated"
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.user.api.check_user", mock):
        rsp = req.post_edit_session(
            server.url, ce.id_session_user_changed, cookies=cookies
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Test response when cookies are missing"
    server, _cookies = auth_server
    rsp = req.post_edit_session(server.url, ce.id_session_user_changed)
    assert rsp.status_code == 401


def test_not_owner(auth_server_commissioner, other_session):
    "Test response when setting session where the user is not the owner"
    server, cookies = auth_server_commissioner
    rsp = req.post_edit_session(server.url, ce.id_session_user_changed, cookies=cookies)
    assert rsp.status_code == 403


def test_no_session(auth_server):
    "Test response when session does not exist"
    server, cookies = auth_server
    rsp = req.post_edit_session(server.url, ce.id_session_user_changed, cookies=cookies)
    assert rsp.status_code == 404


def test_can_change_session(auth_server, other_session):
    "Test that session is changed correctly"
    server, cookies = auth_server
    rsp = req.post_edit_session(server.url, ce.id_session_user_changed, cookies=cookies)
    user = CosmaeUser.objects.filter(id_persistent=cu.test_uuid).get()
    assert user.edit_session_id == other_session.id_persistent
    assert rsp.status_code == 200
    participant_json = {
        "id_participant": user.id_persistent,
        "type_participant": "INTERNAL",
        "name_participant": user.username,
    }
    assert rsp.json() == {
        "name": ce.name_session_user_changed,
        "id_persistent": ce.id_session_user_changed,
        "owner": participant_json,
        "participant_list": [participant_json],
    }
