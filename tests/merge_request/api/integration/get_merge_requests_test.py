# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-statements
from datetime import timedelta
from unittest.mock import MagicMock, patch

import tests.user.common as cu
from tests.merge_request import common as c
from tests.merge_request.api.integration import requests as req
from tests.utils import assert_versioned, format_datetime
from cosmae.exception import NotAuthenticatedException
from cosmae.tag.models_django import TagDefinition, TagDefinitionHistory


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
    created_list = json["created"]
    assert len(created_list) == 1
    created = created_list[0]
    assert len(created) == 7
    assert created["created_at"] == format_datetime(c.time_merge_request1)
    assert created["id_persistent"] == c.id_persistent_merge_request1
    assert created["created_by"] == {
        "user_name": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "APPLICANT",
    }
    assert created["assigned_to"] == {
        "user_name": cu.test_username1,
        "id_persistent": cu.test_uuid1,
        "permission_group": "APPLICANT",
    }
    assert created["state"] == "OPEN"
    assert_versioned(
        created["destination"],
        {
            "id_persistent": c.id_persistent_tag_def_destination1,
            "id_parent_persistent": None,
            "name": c.name_tag_def_destination1,
            "name_path": [c.name_tag_def_destination1],
            "type": "STRING",
            "owner": "test-user1",
            "curated": False,
            "hidden": False,
        },
    )
    assert_versioned(
        created["origin"],
        {
            "name": c.name_tag_def_origin1,
            "name_path": [c.name_tag_def_origin1],
            "id_parent_persistent": None,
            "id_persistent": c.id_persistent_tag_def_origin1,
            "type": "STRING",
            "owner": "test-user",
            "curated": False,
            "hidden": False,
        },
    )
    assigned_list = json["assigned"]
    assert len(assigned_list) == 1
    assigned = assigned_list[0]
    assert len(assigned) == 7
    assert assigned["created_at"] == format_datetime(c.time_merge_request)
    assert assigned["id_persistent"] == c.id_persistent_merge_request
    assert assigned["created_by"] == {
        "user_name": cu.test_username1,
        "id_persistent": cu.test_uuid1,
        "permission_group": "APPLICANT",
    }
    assert assigned["assigned_to"] == {
        "user_name": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "APPLICANT",
    }
    assert assigned["state"] == "OPEN"
    assert_versioned(
        assigned["destination"],
        {
            "id_persistent": c.id_persistent_tag_def_destination,
            "id_parent_persistent": None,
            "name": c.name_tag_def_destination,
            "name_path": [c.name_tag_def_destination],
            "type": "STRING",
            "owner": "test-user",
            "curated": False,
            "hidden": False,
        },
    )
    assert_versioned(
        assigned["origin"],
        {
            "name": c.name_tag_def_origin,
            "name_path": [c.name_tag_def_origin],
            "id_persistent": c.id_persistent_tag_def_origin,
            "id_parent_persistent": None,
            "type": "STRING",
            "owner": "test-user1",
            "curated": False,
            "hidden": False,
        },
    )


def test_get_merge_requests_with_hidden(
    auth_server, merge_request_user, merge_request_user1, origin_tag_def_for_mr1
):
    tag_def, _ = TagDefinitionHistory.change_or_create(
        id_persistent=origin_tag_def_for_mr1.id_persistent,
        id_parent_persistent=origin_tag_def_for_mr1.id_parent_persistent,
        name=origin_tag_def_for_mr1.name,
        owner=origin_tag_def_for_mr1.owner,
        curated=origin_tag_def_for_mr1.curated,
        hidden=True,
        version=origin_tag_def_for_mr1.id,
        time_edit=origin_tag_def_for_mr1.time_edit + timedelta(minutes=60),
    )
    tag_def.save()
    assert TagDefinition.most_recent_by_id(origin_tag_def_for_mr1.id_persistent).hidden
    server, cookies = auth_server
    rsp = req.get_merge_requests(server.url, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 2
    created_list = json["created"]
    assert len(created_list) == 1
    created = created_list[0]
    assert len(created) == 7
    assert created["created_at"] == format_datetime(c.time_merge_request1)
    assert created["id_persistent"] == c.id_persistent_merge_request1
    assert created["created_by"] == {
        "user_name": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "APPLICANT",
    }
    assert created["assigned_to"] == {
        "user_name": cu.test_username1,
        "id_persistent": cu.test_uuid1,
        "permission_group": "APPLICANT",
    }
    assert created["state"] == "OPEN"
    assert_versioned(
        created["destination"],
        {
            "id_persistent": c.id_persistent_tag_def_destination1,
            "id_parent_persistent": None,
            "name": c.name_tag_def_destination1,
            "name_path": [c.name_tag_def_destination1],
            "type": "STRING",
            "owner": "test-user1",
            "curated": False,
            "hidden": False,
        },
    )
    assert_versioned(
        created["origin"],
        {
            "name": c.name_tag_def_origin1,
            "name_path": [c.name_tag_def_origin1],
            "id_parent_persistent": None,
            "id_persistent": c.id_persistent_tag_def_origin1,
            "type": "STRING",
            "owner": "test-user",
            "curated": False,
            "hidden": True,
        },
    )
    assigned_list = json["assigned"]
    assert len(assigned_list) == 1
    assigned = assigned_list[0]
    assert len(assigned) == 7
    assert assigned["created_at"] == format_datetime(c.time_merge_request)
    assert assigned["id_persistent"] == c.id_persistent_merge_request
    assert assigned["created_by"] == {
        "user_name": cu.test_username1,
        "id_persistent": cu.test_uuid1,
        "permission_group": "APPLICANT",
    }
    assert assigned["assigned_to"] == {
        "user_name": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "APPLICANT",
    }
    assert assigned["state"] == "OPEN"
    assert_versioned(
        assigned["destination"],
        {
            "id_persistent": c.id_persistent_tag_def_destination,
            "id_parent_persistent": None,
            "name": c.name_tag_def_destination,
            "name_path": [c.name_tag_def_destination],
            "type": "STRING",
            "owner": "test-user",
            "curated": False,
            "hidden": False,
        },
    )
    assert_versioned(
        assigned["origin"],
        {
            "name": c.name_tag_def_origin,
            "name_path": [c.name_tag_def_origin],
            "id_persistent": c.id_persistent_tag_def_origin,
            "id_parent_persistent": None,
            "type": "STRING",
            "owner": "test-user1",
            "curated": False,
            "hidden": False,
        },
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
                    "user_name": "test-user1",
                    "id_persistent": "2e858c5e-60cf-4ce5-946f-6b4559a21211",
                    "permission_group": "APPLICANT",
                },
                "assigned_to": None,
                "created_at": format_datetime(c.time_merge_request_curated),
                "state": "OPEN",
                "destination": {
                    "id_persistent": "2ec43995-338b-4f4b-b1cc-4bfc71466fc5",
                    "id_parent_persistent": None,
                    "name": "name curated tag test",
                    "name_path": ["name curated tag test"],
                    "type": "STRING",
                    "owner": None,
                    "curated": True,
                    "hidden": False,
                },
                "origin": {
                    "id_persistent": "52d5de0a-2fdb-457f-80d0-6e10131ad1b9",
                    "id_parent_persistent": None,
                    "name": "name tag test1",
                    "name_path": ["name tag test1"],
                    "owner": "test-user1",
                    "type": "STRING",
                    "curated": False,
                    "hidden": False,
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
