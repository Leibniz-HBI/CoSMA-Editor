# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.entity.common as ce
import tests.tag.api.integration.requests as req
import tests.tag.common as c
from cosmae.exception import NotAuthenticatedException


def test_missing_cookies(auth_server):
    "Check 401 status for missing cookies"
    server, _cookies = auth_server
    rsp = req.get_instances_for_entity(server.url, ce.id_persistent_test_0)
    assert rsp.status_code == 401


def test_unauthenticated(auth_server):
    "Check 401 status for failed authentication."
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.tag.api.instances.check_user", mock):
        rsp = req.get_instances_for_entity(server.url, ce.id_persistent_test_0, cookies)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    "Test permissions for applicants."
    server, cookies = auth_server_applicant
    rsp = req.get_instances_for_entity(server.url, ce.id_persistent_test_0, cookies)
    assert rsp.status_code == 403


def test_get_instances(auth_server, tag_instances_user):
    "Test getting instances"
    server, cookies = auth_server
    rsp = req.get_instances_for_entity(server.url, ce.id_persistent_test_0, cookies)
    assert rsp.status_code == 200
    instances = rsp.json()["tag_instances"]
    assert len(instances) == 2
    id_set = {instance["id_persistent"] for instance in instances}
    assert id_set == {c.id_instance_test0, c.id_instance_test2}
