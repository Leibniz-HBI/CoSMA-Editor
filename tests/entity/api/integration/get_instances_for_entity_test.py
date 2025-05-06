# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.entity.api.integration.requests as req
import tests.entity.common as ce
import tests.tag.common as c
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException


def test_missing_cookies(auth_server):
    "Check 401 status for missing cookies"
    server, _cookies = auth_server
    rsp = req.get_entity_values(server.url, ce.id_persistent_test_0)
    assert rsp.status_code == 401


def test_unauthenticated(auth_server):
    "Check 401 status for failed authentication."
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.entity.api.check_user", mock):
        rsp = req.get_entity_values(server.url, ce.id_persistent_test_0, cookies)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    "Test permissions for applicants."
    server, cookies = auth_server_applicant
    rsp = req.get_entity_values(server.url, ce.id_persistent_test_0, cookies)
    assert rsp.status_code == 403


def test_missing_entity(auth_server, tag_instances_user):
    "Test getting instances"
    server, cookies = auth_server
    rsp = req.get_entity_values(server.url, ce.id_persistent_test_0, cookies)
    assert rsp.status_code == 404


def test_get_instances(
    auth_server, tag_instances_user, entity0, entity1, justification0
):
    "Test getting instances"
    server, cookies = auth_server
    rsp = req.get_entity_values(server.url, ce.id_persistent_test_0, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    instances = json["value_list"]
    assert len(instances) == 2
    id_set = {instance["id_persistent"] for instance in instances}
    assert id_set == {c.id_instance_test0, c.id_instance_test2}
    entity = json["entity"]
    assert_versioned(
        entity,
        {
            "id_persistent": ce.id_persistent_test_0,
            "display_txt": ce.display_txt_test0,
            "display_txt_details": "Display Text",
            "disabled": False,
        },
    )
