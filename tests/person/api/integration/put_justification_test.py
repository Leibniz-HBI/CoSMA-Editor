# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,duplicate-code
from unittest.mock import MagicMock, patch

import tests.entity.common as c
import tests.person.api.integration.requests as req
import tests.user.common as cu
from cosmae.entity.models_django import EntityJustification
from cosmae.exception import NotAuthenticatedException

justification_txt = "justification for test"


def test_no_cookies(live_server):
    rsp = req.put_justification(live_server.url, c.id_persistent_test_0, "some")
    assert rsp.status_code == 401


def test_authentication_error(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.person.api.check_user", mock):
        rsp = req.put_justification(
            server.url, c.id_persistent_test_0, justification_txt, cookies=cookies
        )
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    server, cookies = auth_server_applicant
    rsp = req.put_justification(
        server.url, c.id_persistent_test_0, justification_txt, cookies=cookies
    )
    assert rsp.status_code == 403


def test_entity_missing(auth_server):
    server, cookies = auth_server
    rsp = req.put_justification(
        server.url, c.id_persistent_test_0, justification_txt, cookies=cookies
    )
    assert rsp.status_code == 404


def test_empty_justification(auth_server, entity0):
    server, cookies = auth_server
    rsp = req.put_justification(
        server.url, c.id_persistent_test_0, " ", cookies=cookies
    )
    assert rsp.status_code == 400


def test_add_justification(auth_server, entity0):
    server, cookies = auth_server
    rsp = req.put_justification(
        server.url, c.id_persistent_test_0, justification_txt, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    justification = json["justification"]
    assert justification["content"] == justification_txt
    assert justification["author"] == {
        "username": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "CONTRIBUTOR",
    }
    justification_db = (
        EntityJustification.objects.all().get()  # pylint: disable=no-member
    )
    assert justification_db.text == justification_txt
    assert justification_db.author.username == cu.test_username
