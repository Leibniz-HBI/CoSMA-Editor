# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-statements,duplicate-code
from datetime import timedelta
from unittest.mock import MagicMock, patch

import tests.user.common as cu
from tests.merge_request import common as c
from tests.merge_request.api.integration import requests as req
from tests.utils import assert_versioned, format_datetime
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.merge_request.api.check_user", mock):
        rsp = req.get_merge_requests(server.url, cookies=cookies)
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.get_merge_requests(server.url)
    assert rsp.status_code == 401


def test_get_merge_requests(auth_server, merge_request_user, merge_request_user1):
    server, cookies = auth_server
    rsp = req.get_merge_requests(server.url, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 2
    assert_versioned(
        json["created"],
        [
            {
                "created_at": format_datetime(c.time_merge_request1),
                "id_persistent": c.id_persistent_merge_request1,
                "created_by": {
                    "username": cu.test_username,
                    "id_persistent": cu.test_uuid,
                    "permission_group": "CONTRIBUTOR",
                },
                "assigned_to": {
                    "username": cu.test_username1,
                    "id_persistent": cu.test_uuid1,
                    "permission_group": "CONTRIBUTOR",
                },
                "state": "OPEN",
                "disable_origin_on_merge": False,
                "destination": {
                    "id_persistent": c.id_persistent_column_destination1,
                    "id_parent_persistent": None,
                    "name": c.name_column_destination1,
                    "name_path": [c.name_column_destination1],
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
                "origin": {
                    "name": c.name_column_origin1,
                    "name_path": [c.name_column_origin1],
                    "id_parent_persistent": None,
                    "id_persistent": c.id_persistent_column_origin1,
                    "type": "STRING",
                    "description": None,
                    "curated": False,
                    "owner": {
                        "username": "test-user",
                        "id_persistent": cu.test_uuid,
                        "permission_group": "CONTRIBUTOR",
                    },
                    "hidden": False,
                    "disabled": False,
                },
            }
        ],
    )
    assert_versioned(
        json["assigned"],
        [
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
            }
        ],
    )


def test_get_merge_requests_with_hidden(
    auth_server, merge_request_user, merge_request_user1, origin_column_for_mr1
):
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=origin_column_for_mr1.id_persistent,
        id_parent_persistent=origin_column_for_mr1.id_parent_persistent,
        name=origin_column_for_mr1.name,
        owner_id=origin_column_for_mr1.owner.id,
        curated=origin_column_for_mr1.curated,
        hidden=True,
        version=origin_column_for_mr1.id,
        time_edit=origin_column_for_mr1.time_edit + timedelta(minutes=60),
        written_by_session=origin_column_for_mr1.owner.edit_session,
    )
    column.save()
    assert Column.most_recent_by_id(origin_column_for_mr1.id_persistent).hidden
    server, cookies = auth_server
    rsp = req.get_merge_requests(server.url, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 2
    assert_versioned(
        json["created"],
        [
            {
                "created_at": format_datetime(c.time_merge_request1),
                "id_persistent": c.id_persistent_merge_request1,
                "created_by": {
                    "username": cu.test_username,
                    "id_persistent": cu.test_uuid,
                    "permission_group": "CONTRIBUTOR",
                },
                "assigned_to": {
                    "username": cu.test_username1,
                    "id_persistent": cu.test_uuid1,
                    "permission_group": "CONTRIBUTOR",
                },
                "state": "OPEN",
                "disable_origin_on_merge": False,
                "destination": {
                    "id_persistent": c.id_persistent_column_destination1,
                    "id_parent_persistent": None,
                    "name": c.name_column_destination1,
                    "name_path": [c.name_column_destination1],
                    "type": "STRING",
                    "description": None,
                    "curated": False,
                    "owner": {
                        "username": "test-user1",
                        "id_persistent": cu.test_uuid1,
                        "permission_group": "CONTRIBUTOR",
                    },
                    "hidden": False,
                    "disabled": False,
                },
                "origin": {
                    "name": c.name_column_origin1,
                    "name_path": [c.name_column_origin1],
                    "id_parent_persistent": None,
                    "id_persistent": c.id_persistent_column_origin1,
                    "type": "STRING",
                    "description": None,
                    "owner": {
                        "username": "test-user",
                        "id_persistent": cu.test_uuid,
                        "permission_group": "CONTRIBUTOR",
                    },
                    "curated": False,
                    "hidden": True,
                    "disabled": False,
                },
            }
        ],
    )
    assert_versioned(
        json["assigned"],
        [
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
                    "curated": False,
                    "owner": {
                        "username": "test-user",
                        "id_persistent": cu.test_uuid,
                        "permission_group": "CONTRIBUTOR",
                    },
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
            }
        ],
    )


def test_includes_curated(
    auth_server_commissioner,
    merge_request_user,
    merge_request_user1,
    merge_request_curated,
):
    server, cookies = auth_server_commissioner
    rsp = req.get_merge_requests(server.url, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert_versioned(
        json["assigned"],
        [
            {
                "id_persistent": c.id_persistent_merge_request_curated,
                "created_by": {
                    "username": "test-user1",
                    "id_persistent": "2e858c5e-60cf-4ce5-946f-6b4559a21211",
                    "permission_group": "CONTRIBUTOR",
                },
                "assigned_to": None,
                "created_at": format_datetime(c.time_merge_request_curated),
                "state": "OPEN",
                "disable_origin_on_merge": False,
                "destination": {
                    "id_persistent": "2ec43995-338b-4f4b-b1cc-4bfc71466fc5",
                    "id_parent_persistent": None,
                    "name": "name curated column test",
                    "name_path": ["name curated column test"],
                    "type": "STRING",
                    "description": None,
                    "owner": None,
                    "curated": True,
                    "hidden": False,
                    "disabled": False,
                },
                "origin": {
                    "id_persistent": "52d5de0a-2fdb-457f-80d0-6e10131ad1b9",
                    "id_parent_persistent": None,
                    "name": "name column test1",
                    "name_path": ["name column test1"],
                    "owner": {
                        "username": "test-user1",
                        "id_persistent": cu.test_uuid1,
                        "permission_group": "CONTRIBUTOR",
                    },
                    "type": "STRING",
                    "description": None,
                    "curated": False,
                    "hidden": False,
                    "disabled": False,
                },
            }
        ],
    )
    assert len(json["created"]) == 0


def test_does_not_include_curated_for_normal_user(
    auth_server,
    merge_request_curated,
):
    server, cookies = auth_server
    rsp = req.get_merge_requests(server.url, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {"assigned": [], "created": []}
