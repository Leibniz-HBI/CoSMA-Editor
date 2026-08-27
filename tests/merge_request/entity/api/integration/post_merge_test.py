# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.merge_request.entity.common as c
import tests.user.common as cu
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.entity.queue import apply_entity_merge_request
from tests.merge_request.entity.api.integration import requests as req


def test_unknown_user(auth_server_commissioner):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server_commissioner
    with patch("cosmae.merge_request.entity.api.check_user", mock):
        rsp = req.post_start_merge(
            server.url, c.id_merge_request_persistent, cookies=cookies
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server_commissioner):
    server, _ = auth_server_commissioner
    rsp = req.post_start_merge(server.url, c.id_merge_request_persistent)
    assert rsp.status_code == 401


def test_no_mr(auth_server_commissioner):
    server, cookies = auth_server_commissioner
    rsp = req.post_start_merge(
        server.url, "4e679630-241e-40f8-b175-c4b7916be379", cookies=cookies
    )
    assert rsp.status_code == 404


def test_normal_user(auth_server1, merge_request_user):
    server, _, cookies = auth_server1
    rsp = req.post_start_merge(
        server.url, str(merge_request_user.id_persistent), cookies=cookies
    )
    assert rsp.status_code == 403


def test_start_merge(
    auth_server_commissioner,
    conflict_resolution_keep1,
    resolution_curated_destination_none,
):
    server, cookies = auth_server_commissioner
    mock = MagicMock()
    with patch("cosmae.merge_request.entity.api.enqueue", mock):
        rsp = req.post_start_merge(
            server.url,
            c.id_merge_request_persistent,
            cookies=cookies,
        )
    assert rsp.status_code == 200
    mock.assert_called_once_with(
        apply_entity_merge_request,
        c.id_merge_request_persistent,
        cu.test_uuid_commissioner,
    )


def test_conflict_updated_merge(
    auth_server_commissioner,
    conflict_resolution_keep1,
    value_curated_updated1,
):
    server, cookies = auth_server_commissioner
    mock = MagicMock()
    with patch("cosmae.merge_request.entity.api.enqueue", mock):
        rsp = req.post_start_merge(
            server.url,
            c.id_merge_request_persistent,
            cookies=cookies,
        )
    assert rsp.status_code == 400
    mock.assert_not_called()


def test_unresolved_conflict(
    auth_server_commissioner,
    instances_merge_request_origin_user,
    conflict_resolution_unresolved0,
):
    server, cookies = auth_server_commissioner
    mock = MagicMock()
    with patch("cosmae.merge_request.entity.api.enqueue", mock):
        rsp = req.post_start_merge(
            server.url,
            c.id_merge_request_persistent,
            cookies=cookies,
        )
    assert rsp.status_code == 400
    mock.assert_not_called()
