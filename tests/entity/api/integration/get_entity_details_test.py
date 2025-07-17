# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.entity.api.integration.requests as req
import tests.entity.common as ce
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException


def test_missing_cookies(auth_server):
    "Check 401 status for missing cookies"
    server, _cookies = auth_server
    rsp = req.get_entity_details(server.url, ce.id_persistent_test_0)
    assert rsp.status_code == 401


def test_unauthenticated(auth_server):
    "Check 401 status for failed authentication."
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.entity.api.check_user", mock):
        rsp = req.get_entity_details(
            server.url, ce.id_persistent_test_0, cookies=cookies
        )
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    "Test permissions for applicants."
    server, cookies = auth_server_applicant
    rsp = req.get_entity_details(server.url, ce.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 403


def test_missing_entity(auth_server, values_user):
    "Test getting instances"
    server, cookies = auth_server
    rsp = req.get_entity_details(server.url, ce.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 404


def test_up_until_time(auth_server, entity1, entity1_changed, justification1):
    "Test if old instance details can be retrieved."
    server, cookies = auth_server
    rsp = req.get_entity_details(
        server.url,
        ce.id_persistent_test_1,
        up_until_time=ce.time_justification_1,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    entity = rsp.json()
    assert_versioned(
        entity,
        {
            "id_persistent": ce.id_persistent_test_1,
            "display_txt": ce.display_txt_test1,
            "display_txt_details": "Display Text",
            "disabled": False,
            "justification_txt": justification1.text,
        },
    )
    # make sure most recent is returned, when no date is provided.
    rsp = req.get_entity_details(
        server.url,
        ce.id_persistent_test_1,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    entity = rsp.json()
    assert_versioned(
        entity,
        {
            "id_persistent": ce.id_persistent_test_1,
            "display_txt": ce.display_txt_test1_changed,
            "display_txt_details": "Display Text",
            "disabled": False,
            "justification_txt": justification1.text,
        },
    )


def test_get_instances(auth_server, entity0, justification0):
    "Test getting entity detail"
    server, cookies = auth_server
    rsp = req.get_entity_details(server.url, ce.id_persistent_test_0, cookies=cookies)
    assert rsp.status_code == 200
    entity = rsp.json()
    assert_versioned(
        entity,
        {
            "id_persistent": ce.id_persistent_test_0,
            "display_txt": ce.display_txt_test0,
            "display_txt_details": "Display Text",
            "disabled": False,
            "justification_txt": justification0.text,
        },
    )
