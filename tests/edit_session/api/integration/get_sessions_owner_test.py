# pylint: disable=missing-module-docstring,missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements


from unittest.mock import MagicMock, patch

import tests.edit_session.common as c
import tests.user.common as cu
from cosmae.exception import NotAuthenticatedException
from tests.edit_session.api.integration import requests as req


def test_unknown_user(auth_server):
    "Test response when user can not be authenticated"
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.edit_session.api.check_user", mock):
        rsp = req.get_sessions_owner(server.url, cookies=cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Check error code for missing cookies"
    server, _cookies = auth_server
    rsp = req.get_sessions_owner(server.url, cookies=None)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    "Make sure applicant can not search for participants."
    server, cookies = auth_server_applicant
    rsp = req.get_sessions_owner(server.url, cookies=cookies)
    assert rsp.status_code == 403


def test_get_sessions_owner(auth_server, other_session):
    "Make sure it can retrieve sessions owned by a user"
    server, cookies = auth_server
    rsp = req.get_sessions_owner(server.url, cookies=cookies)
    assert rsp.status_code == 200
    participant_json = {
        "id_participant": cu.test_uuid,
        "type_participant": "INTERNAL",
        "name_participant": cu.test_username,
    }
    json = rsp.json()
    session_list = json["edit_session_list"]
    assert session_list == [
        {
            "id_persistent": c.id_session_user,
            "owner": participant_json,
            "name": c.name_session_user,
            "participant_list": [participant_json],
        },
        {
            "id_persistent": c.id_session_user_changed,
            "owner": participant_json,
            "name": c.name_session_user_changed,
            "participant_list": [participant_json],
        },
    ]
