# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,duplicate-code
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

import tests.entity.common as c
import tests.person.api.integration.requests as req
from cosmae.entity.models_django import EntityReason
from cosmae.exception import NotAuthenticatedException


def test_no_cookies(live_server):
    rsp = req.get_reason(live_server.url, c.id_persistent_test_0)
    assert rsp.status_code == 401


def test_authentication_error(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.person.api.check_user", mock):
        rsp = req.get_reason(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    server, cookies = auth_server_applicant
    rsp = req.get_reason(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 403


def test_no_entity(auth_server):
    server, cookies = auth_server
    rsp = req.get_reason(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {"reasons": []}


reason_txt = "A reason for tests"
id_reason = "4a5a7ada-d547-4909-b1d5-65680820a83d"
time_reason = datetime(2012, 4, 3, tzinfo=timezone.utc)

reason_txt_1 = "Another reason for tests"
id_reason_1 = "6d71b873-bad7-45c7-93bf-30e856bfdac1"
time_reason_1 = datetime(2012, 4, 3, tzinfo=timezone.utc)


@pytest.fixture
def reason(entity0, user1):
    EntityReason.add(
        id_persistent=id_reason,
        id_entity_persistent=entity0.id_persistent,
        text=reason_txt,
        timestamp=time_reason,
        author=user1,
    )


@pytest.fixture
def reason1(entity0, user1):
    EntityReason.add(
        id_persistent=id_reason_1,
        id_entity_persistent=entity0.id_persistent,
        text=reason_txt_1,
        timestamp=time_reason_1,
        author=user1,
    )


def test_get_reasons(auth_server, reason, reason1):
    server, cookies = auth_server
    rsp = req.get_reason(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    reasons = json["reasons"]
    assert len(reasons) == 2
    assert reasons[0]["content"] == reason_txt
    assert reasons[1]["content"] == reason_txt_1
