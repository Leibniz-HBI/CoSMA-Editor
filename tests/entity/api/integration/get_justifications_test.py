# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,duplicate-code
from unittest.mock import MagicMock, patch

import pytest

import tests.entity.api.integration.requests as req
import tests.entity.common as c
from cosmae.entity.models_django import EntityJustification
from cosmae.exception import NotAuthenticatedException


def test_no_cookies(live_server):
    rsp = req.get_justification(live_server.url, c.id_persistent_test_0)
    assert rsp.status_code == 401


def test_authentication_error(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.entity.api.check_user", mock):
        rsp = req.get_justification(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    server, cookies = auth_server_applicant
    rsp = req.get_justification(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 403


def test_no_entity(auth_server):
    server, cookies = auth_server
    rsp = req.get_justification(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {"justifications": []}


@pytest.fixture
def justification(entity0, user1):
    EntityJustification.add(
        id_persistent=c.id_justification_0,
        id_entity_persistent=entity0.id_persistent,
        text=c.justification_0,
        timestamp=c.time_justification_0,
        author=user1,
    )


@pytest.fixture
def justification1(entity0, user1):
    EntityJustification.add(
        id_persistent=c.id_justification_1,
        id_entity_persistent=entity0.id_persistent,
        text=c.justification_1,
        timestamp=c.time_justification_1,
        author=user1,
    )


def test_get_justifications(auth_server, justification, justification1):
    server, cookies = auth_server
    rsp = req.get_justification(server.url, c.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    justifications = json["justifications"]
    assert len(justifications) == 2
    assert justifications[0]["content"] == c.justification_0
    assert justifications[1]["content"] == c.justification_1


def test_get_justification_history(auth_server, justification, justification1):
    server, cookies = auth_server
    rsp = req.get_justification(
        server.url, c.id_persistent_test_0, c.time_justification_0, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    justifications = json["justifications"]
    assert len(justifications) == 1
    assert justifications[0]["content"] == c.justification_0
