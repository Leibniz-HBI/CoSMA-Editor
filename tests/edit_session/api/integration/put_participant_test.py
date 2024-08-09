# pylint: disable=missing-module-docstring,missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.edit_session.common as c
import tests.user.common as cu
from tests.edit_session.api.integration import requests as req
from cosmae.edit_session.models_django import EditSessionParticipant
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Test response when user can not be authenticated"
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.edit_session.api.check_user", mock):
        rsp = req.put_participant(
            server.url,
            c.id_session_user,
            "INTERNAL",
            cu.test_uuid1,
            cu.test_username1,
            cookies=cookies,
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Test response when cookies are missing"
    server, _cookies = auth_server
    rsp = req.put_participant(
        server.url,
        c.id_session_user,
        "INTERNAL",
        cu.test_uuid1,
        cu.test_username1,
        cookies=None,
    )
    assert rsp.status_code == 401


def test_wrong_user(auth_server1, user):
    "Make sure you can not edit others edit sessions."
    server, _cookies, cookies = auth_server1
    rsp = req.put_participant(
        server.url,
        c.id_session_user,
        "INTERNAL",
        cu.test_uuid1,
        cu.test_username1,
        cookies=cookies,
    )
    assert rsp.status_code == 403


def test_applicant(auth_server_applicant):
    "Make sure applicants can not add edit session participants"
    server, cookies = auth_server_applicant
    rsp = req.put_participant(
        server.url,
        c.id_session_user,
        "INTERNAL",
        cu.test_uuid1,
        cu.test_username1,
        cookies=cookies,
    )
    assert rsp.status_code == 403


def test_can_add(auth_server):
    "Make sure you can add to your own session."
    server, cookies = auth_server
    rsp = req.put_participant(
        server.url,
        c.id_session_user,
        "INTERNAL",
        cu.test_uuid1,
        cu.test_username1,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "id_participant": cu.test_uuid1,
        "name_participant": cu.test_username1,
        "type_participant": "INTERNAL",
    }


def test_idempotent(auth_server):
    "Make sure participant is not added twice."
    server, cookies = auth_server
    rsp = req.put_participant(
        server.url,
        c.id_session_user,
        "INTERNAL",
        cu.test_uuid,
        cu.test_username,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.put_participant(
        server.url,
        c.id_session_user,
        "INTERNAL",
        cu.test_uuid,
        cu.test_username,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    assert (
        len(EditSessionParticipant.objects.filter(edit_session_id=c.id_session_user))
        == 1
    )
