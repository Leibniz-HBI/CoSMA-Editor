# pylint: disable=missing-module-docstring,missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.edit_session.common as c
import tests.user.common as cu
from cosmae.exception import NotAuthenticatedException
from cosmae.util import CosmaeUser
from tests.edit_session.api.integration import requests as req


def test_unknown_user(auth_server):
    "Test response when user can not be authenticated"
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.edit_session.api.check_user", mock):
        rsp = req.put_edit_session(server.url, cookies=cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Check error code for missing cookies"
    server, _cookies = auth_server
    rsp = req.put_edit_session(server.url, cookies=None)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    "Make sure applicants can not create sessions"
    server, cookies = auth_server_applicant
    rsp = req.put_edit_session(server.url, cookies=cookies)
    assert rsp.status_code == 403


def test_create_edit_session_without_name(auth_server):
    mock = MagicMock()
    mock.return_value = c.id_session_user_changed
    server, cookies = auth_server
    with patch("cosmae.edit_session.api.uuid4", mock):
        rsp = req.put_edit_session(server.url, cookies=cookies)
    user = CosmaeUser.objects.filter(id_persistent=cu.test_uuid).get()
    assert user.edit_session_id == c.id_session_user_changed
    assert rsp.status_code == 200
    participant_json = {
        "id_participant": user.id_persistent,
        "type_participant": "INTERNAL",
        "name_participant": user.username,
    }
    assert rsp.json() == {
        "name": "Edit Session 1",
        "id_persistent": c.id_session_user_changed,
        "owner": participant_json,
        "participant_list": [participant_json],
    }


def test_create_edit_session_with_name(auth_server):
    mock = MagicMock()
    mock.return_value = c.id_session_user_changed
    server, cookies = auth_server
    name = "session name"
    with patch("cosmae.edit_session.api.uuid4", mock):
        rsp = req.put_edit_session(server.url, name=name, cookies=cookies)
    user = CosmaeUser.objects.filter(id_persistent=cu.test_uuid).get()
    participant_json = {
        "id_participant": user.id_persistent,
        "type_participant": "INTERNAL",
        "name_participant": user.username,
    }
    assert user.edit_session_id == c.id_session_user_changed
    assert rsp.status_code == 200
    assert rsp.json() == {
        "name": name,
        "id_persistent": c.id_session_user_changed,
        "owner": participant_json,
        "participant_list": [participant_json],
    }
