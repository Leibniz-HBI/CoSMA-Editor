# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments
from unittest.mock import MagicMock, patch

import tests.contribution.common as cc
import tests.contribution.preview.api.integration.requests as req
import tests.contribution.preview.common as c
import tests.entity.common as ce
from cosmae.exception import NotAuthenticatedException


def test_no_cookies(auth_server):
    server, _cookies = auth_server
    rsp = req.get_preview(server.url, cc.id_test0, cc.id_persistent_tag_def_test0)
    assert rsp.status_code == 401


def test_unauthorized(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.contribution.preview.api.check_user", mock):
        rsp = req.get_preview(
            server.url, cc.id_test0, cc.id_persistent_tag_def_test0, cookies=cookies
        )
    assert rsp.status_code == 401


def test_preview_unassigned(auth_server, instances_contribution):
    server, _cookies = auth_server
    rsp = req.get_preview(
        server.url, cc.id_test0, cc.id_persistent_tag_def_test0, cookies=_cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json["destination_values"] == []
    assert json["contribution_values"] == [c.value_contribution, c.value_contribution_1]


def test_preview_assigned(
    auth_server, instances_contribution_assigned, instances_existing
):
    server, _cookies = auth_server
    rsp = req.get_preview(
        server.url, cc.id_test0, cc.id_persistent_tag_def_test0, cookies=_cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json["destination_values"] == [c.value_existing, c.value_existing1]
    assert json["contribution_values"] == [c.value_contribution, c.value_contribution_1]


def test_preview_display_txt(
    auth_server, instances_contribution_assigned_display_txt, entity0, entity1
):
    server, _cookies = auth_server
    rsp = req.get_preview(
        server.url, cc.id_test0, cc.id_persistent_tag_def_test0, cookies=_cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json["destination_values"] == [entity0.display_txt, entity1.display_txt]
    assert json["contribution_values"] == [c.value_contribution, c.value_contribution_1]


def test_preview_justification(
    auth_server,
    instances_contribution_assigned_justification,
    entity0,
    entity1,
    justification0,
    justification1,
):
    server, _cookies = auth_server
    rsp = req.get_preview(
        server.url, cc.id_test0, cc.id_persistent_tag_def_test0, cookies=_cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json["destination_values"] == [ce.justification_0, ce.justification_1]
    assert json["contribution_values"] == [c.value_contribution, c.value_contribution_1]
