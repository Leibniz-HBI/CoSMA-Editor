# pylint: disable=missing-module-docstring,missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements,duplicate-code


from unittest.mock import MagicMock, patch

import tests.edit_session.common as c
import tests.user.common as cu
from tests.edit_session.api.integration import requests as req
from cosmae.edit_session.models_django import EditSessionParticipant
from cosmae.exception import NotAuthenticatedException

new_name = "patched name for user session"


def test_unknown_user(auth_server, session_participant_commissioner):
    "Test response when user can not be authenticated"
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.edit_session.api.check_user", mock):
        rsp = req.delete_participant(
            server.url, c.id_session_user, cu.test_uuid_commissioner, cookies=cookies
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server, session_participant_commissioner):
    "Check error code for missing cookies"
    server, _cookies = auth_server
    rsp = req.delete_participant(
        server.url, c.id_session_user, cu.test_uuid_commissioner, cookies=None
    )
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant, session_participant_commissioner):
    "Make sure applicant can not search for participants."
    server, cookies = auth_server_applicant
    rsp = req.delete_participant(
        server.url, c.id_session_user, cu.test_uuid_commissioner, cookies=cookies
    )
    assert rsp.status_code == 403


def test_wrong_user(auth_server1, session_participant_commissioner):
    server, _cookies, cookies = auth_server1
    rsp = req.delete_participant(
        server.url, c.id_session_user, cu.test_uuid_commissioner, cookies=cookies
    )
    assert rsp.status_code == 403


def test_remove_as_owner(auth_server, session_participant_commissioner):
    "Make sure it can retrieve sessions owned by a user"
    server, cookies = auth_server
    assert (
        len(EditSessionParticipant.objects.filter(edit_session_id=c.id_session_user))
        == 2
    )
    rsp = req.delete_participant(
        server.url, c.id_session_user, cu.test_uuid_commissioner, cookies=cookies
    )
    assert rsp.status_code == 200
    assert (
        len(EditSessionParticipant.objects.filter(edit_session_id=c.id_session_user))
        == 1
    )


def test_remove_as_participant(
    user, auth_server_commissioner, session_participant_commissioner
):
    "Make sure it can retrieve sessions owned by a user"
    assert (
        len(EditSessionParticipant.objects.filter(edit_session_id=c.id_session_user))
        == 2
    )
    server, cookies = auth_server_commissioner
    rsp = req.delete_participant(
        server.url, c.id_session_user, cu.test_uuid_commissioner, cookies=cookies
    )
    assert rsp.status_code == 200
    assert (
        len(EditSessionParticipant.objects.filter(edit_session_id=c.id_session_user))
        == 1
    )
