# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,duplicate-code
from unittest.mock import MagicMock, patch

import tests.entity.common as c
import tests.person.api.integration.requests as req
import tests.user.common as cu
from cosmae.entity.models_django import EntityReason
from cosmae.exception import NotAuthenticatedException

reason_txt = "reason for test"


def test_no_cookies(live_server):
    rsp = req.put_reason(live_server.url, c.id_persistent_test_0, "some")
    assert rsp.status_code == 401


def test_authentication_error(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.person.api.check_user", mock):
        rsp = req.put_reason(
            server.url, c.id_persistent_test_0, reason_txt, cookies=cookies
        )
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    server, cookies = auth_server_applicant
    rsp = req.put_reason(
        server.url, c.id_persistent_test_0, reason_txt, cookies=cookies
    )
    assert rsp.status_code == 403


def test_entity_missing(auth_server):
    server, cookies = auth_server
    rsp = req.put_reason(
        server.url, c.id_persistent_test_0, reason_txt, cookies=cookies
    )
    assert rsp.status_code == 404


def test_add_reason(auth_server, entity0):
    server, cookies = auth_server
    rsp = req.put_reason(
        server.url, c.id_persistent_test_0, reason_txt, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    reason = json["reason"]
    assert reason["content"] == reason_txt
    assert reason["author"] == {
        "username": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "CONTRIBUTOR",
    }
    reason_db = EntityReason.objects.all().get()  # pylint: disable=no-member
    assert reason_db.text == reason_txt
    assert reason_db.author.username == cu.test_username
