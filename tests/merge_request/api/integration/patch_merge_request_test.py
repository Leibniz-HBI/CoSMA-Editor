# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.common as cu
from tests.merge_request import common as c
from tests.merge_request.api.integration import requests as req
from tests.utils import assert_versioned, format_datetime
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ColumnMergeRequest


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.merge_request.api.check_user", mock):
        rsp = req.patch_merge_request(
            server.url, c.id_persistent_merge_request, {}, cookies=cookies
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.patch_merge_request(server.url, c.id_persistent_merge_request, {})
    assert rsp.status_code == 401


def test_wrong_user(auth_server_commissioner, merge_request_user1):
    server, cookies = auth_server_commissioner
    rsp = req.patch_merge_request(
        server.url, merge_request_user1.id_persistent, {}, cookies
    )
    assert rsp.status_code == 403


def test_set_disable_on_merge(auth_server, merge_request_user):
    server, cookies = auth_server
    rsp = req.patch_merge_request(
        server.url,
        merge_request_user.id_persistent,
        {"disable_origin_on_merge": True},
        cookies,
    )
    assert rsp.status_code == 200
    assert (
        ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
            id_persistent=merge_request_user.id_persistent
        )
        .get()
        .disable_origin_on_merge
    )

    rsp = req.patch_merge_request(
        server.url,
        merge_request_user.id_persistent,
        {"disable_origin_on_merge": False},
        cookies,
    )
    assert rsp.status_code == 200
    assert (
        not ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
            id_persistent=merge_request_user.id_persistent
        )
        .get()
        .disable_origin_on_merge
    )
    assert_versioned(
        rsp.json(),
        {
            "created_at": format_datetime(c.time_merge_request),
            "id_persistent": c.id_persistent_merge_request,
            "created_by": {
                "username": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "CONTRIBUTOR",
            },
            "assigned_to": {
                "username": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "CONTRIBUTOR",
            },
            "state": "OPEN",
            "disable_origin_on_merge": False,
            "destination": {
                "id_persistent": c.id_persistent_column_destination,
                "id_parent_persistent": None,
                "name": c.name_column_destination,
                "name_path": [c.name_column_destination],
                "type": "STRING",
                "description": None,
                "owner": {
                    "username": "test-user",
                    "id_persistent": cu.test_uuid,
                    "permission_group": "CONTRIBUTOR",
                },
                "curated": False,
                "hidden": False,
                "disabled": False,
            },
            "origin": {
                "name": c.name_column_origin,
                "name_path": [c.name_column_origin],
                "id_persistent": c.id_persistent_column_origin,
                "id_parent_persistent": None,
                "type": "STRING",
                "description": None,
                "owner": {
                    "username": "test-user1",
                    "id_persistent": cu.test_uuid1,
                    "permission_group": "CONTRIBUTOR",
                },
                "curated": False,
                "hidden": False,
                "disabled": False,
            },
        },
    )
