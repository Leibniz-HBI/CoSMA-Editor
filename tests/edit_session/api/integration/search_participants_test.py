# pylint: disable=missing-module-docstring,missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements


from unittest.mock import MagicMock, patch

import tests.edit_session.common as c
import tests.user.common as cu
from tests.edit_session.api.integration import requests as req
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Test response when user can not be authenticated"
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.edit_session.api.check_user", mock):
        rsp = req.post_search_participant(server.url, "", cookies=cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Check error code for missing cookies"
    server, _cookies = auth_server
    rsp = req.post_search_participant(server.url, "", cookies=None)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    "Make sure applicant can not search for participants."
    server, cookies = auth_server_applicant
    rsp = req.post_search_participant(server.url, "", cookies=cookies)
    assert rsp.status_code == 403


def test_search_participants(auth_server, user1, user_editor):
    server, cookies = auth_server
    rsp = req.post_search_participant(server.url, "", cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    search_result_list = json["search_result_list"]
    assert len(search_result_list) == 3
    search_result_map = {user["id_participant"]: user for user in search_result_list}
    assert search_result_map[cu.test_uuid] == {
        "id_participant": cu.test_uuid,
        "type_participant": "INTERNAL",
        "name_participant": cu.test_username,
    }
    assert search_result_map[cu.test_uuid1] == {
        "id_participant": cu.test_uuid1,
        "type_participant": "INTERNAL",
        "name_participant": cu.test_username1,
    }
    assert search_result_map[cu.test_uuid_editor] == {
        "id_participant": cu.test_uuid_editor,
        "type_participant": "INTERNAL",
        "name_participant": cu.test_username_editor,
    }


def test_search_orcid(auth_server, get_orcid_token_mock, get_orcid_person_mock):
    server, cookies = auth_server
    rsp = req.post_search_participant(server.url, c.orcid_0, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "search_result_list": [
            {
                "id_participant": c.orcid_no_uri,
                "name_participant": c.name_orcid,
                "type_participant": "ORCID",
            }
        ]
    }
