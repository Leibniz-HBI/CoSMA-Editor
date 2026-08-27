# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.column.common as cc
from cosmae.exception import NotAuthenticatedException
from tests.merge_request.entity import common as c
from tests.merge_request.entity.api.integration import requests as req
from tests.user import common as cu
from tests.utils import assert_versioned


def test_unknown_user(auth_server_commissioner):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server_commissioner
    with patch("cosmae.merge_request.entity.api.check_user", mock):
        rsp = req.post_reverse_origin_destination(
            server.url,
            c.id_merge_request_persistent,
            cookies=cookies,
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server_commissioner):
    server, _ = auth_server_commissioner
    rsp = req.post_reverse_origin_destination(
        server.url,
        c.id_merge_request_persistent,
    )
    assert rsp.status_code == 401


def test_normal_user(auth_server):
    server, cookies = auth_server
    rsp = req.post_reverse_origin_destination(
        server.url,
        c.id_merge_request_persistent,
        cookies=cookies,
    )
    assert rsp.status_code == 403


def test_reverse(
    auth_server_commissioner,
    merge_request_user,
    conflict_resolution_replace0,
    resolution_curated_destination_none,
):
    server, cookies = auth_server_commissioner
    rsp = req.post_reverse_origin_destination(
        server.url,
        merge_request_user.id_persistent,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 5
    assert_versioned(
        json["merge_request"],
        {
            "created_by": {
                "username": cu.test_username_commissioner,
                "id_persistent": cu.test_uuid_commissioner,
                "permission_group": "COMMISSIONER",
            },
            "id_persistent": c.id_merge_request_persistent,
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_entity_destination_persistent,
                "display_txt": c.display_txt_entity_destination,
                "display_txt_details": "Display Text",
                "disabled": False,
            },
            "destination": {
                "id_persistent": c.id_entity_origin_persistent,
                "display_txt": c.display_txt_entity_origin,
                "display_txt_details": "Display Text",
                "disabled": False,
            },
        },
    )

    assert_versioned(
        json["conflicts"],
        [
            {
                "replacement_state": "KEEP",
                "replacement_value": None,
                "column": {
                    "name_path": [cc.name_column_curated_test],
                    "id_parent_persistent": None,
                    "id_persistent": cc.id_column_curated_test,
                    "curated": True,
                    "hidden": False,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_destination_curated,
                    "value": c.value_destination_curated,
                },
                "value_destination": {
                    "id_persistent": c.id_instance_origin_curated,
                    "value": c.value_origin_curated,
                },
            },
        ],
    )
    assert json["unresolvable_conflicts"] == []
    assert json["updated"] == []


def test_reverse_replacement_value(
    auth_server_commissioner,
    merge_request_user,
    conflict_resolution_replacement_value,
    resolution_curated_destination_none,
):
    server, cookies = auth_server_commissioner
    rsp = req.post_reverse_origin_destination(
        server.url,
        merge_request_user.id_persistent,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 5
    assert_versioned(
        json["merge_request"],
        {
            "created_by": {
                "username": cu.test_username_commissioner,
                "id_persistent": cu.test_uuid_commissioner,
                "permission_group": "COMMISSIONER",
            },
            "id_persistent": c.id_merge_request_persistent,
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_entity_destination_persistent,
                "display_txt": c.display_txt_entity_destination,
                "display_txt_details": "Display Text",
                "disabled": False,
            },
            "destination": {
                "id_persistent": c.id_entity_origin_persistent,
                "display_txt": c.display_txt_entity_origin,
                "display_txt_details": "Display Text",
                "disabled": False,
            },
        },
    )

    conflict = {
        "replacement_state": "VALUE",
        "replacement_value": c.replacement_value,
        "column": {
            "name_path": [cc.name_column_curated_test1],
            "id_parent_persistent": None,
            "id_persistent": cc.id_column_curated_test1,
            "curated": True,
            "hidden": False,
        },
        "value_origin": {
            "id_persistent": c.id_instance_destination1,
            "value": c.value_destination1,
        },
        "value_destination": {
            "id_persistent": c.id_instance_origin1,
            "value": c.value_origin1,
        },
    }
    assert_versioned(
        json["conflicts"],
        [
            conflict,
        ],
    )
    assert_versioned(json["unresolvable_conflicts"], [])
    assert json["updated"] == []


def test_double_reverse(
    auth_server_commissioner,
    instance_merge_request_destination_user_conflict1,
    merge_request_user,
    conflict_resolution_replace0,
    conflict_resolution_keep1,
):
    server, cookies = auth_server_commissioner
    rsp = req.post_reverse_origin_destination(
        server.url,
        merge_request_user.id_persistent,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.post_reverse_origin_destination(
        server.url,
        merge_request_user.id_persistent,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 5
    assert_versioned(
        json["merge_request"],
        {
            "created_by": {
                "username": cu.test_username_commissioner,
                "id_persistent": cu.test_uuid_commissioner,
                "permission_group": "COMMISSIONER",
            },
            "id_persistent": c.id_merge_request_persistent,
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_entity_origin_persistent,
                "display_txt": c.display_txt_entity_origin,
                "display_txt_details": "Display Text",
                "disabled": False,
            },
            "destination": {
                "id_persistent": c.id_entity_destination_persistent,
                "display_txt": c.display_txt_entity_destination,
                "display_txt_details": "Display Text",
                "disabled": False,
            },
        },
    )

    unresolvable = {
        "replacement_state": "KEEP",
        "replacement_value": None,
        "column": {
            "name_path": [cc.name_column_curated_test1],
            "id_parent_persistent": None,
            "id_persistent": cc.id_column_curated_test1,
            "curated": True,
        },
        "value_origin": {
            "id_persistent": c.id_instance_origin1,
            "value": c.value_origin1,
        },
        "value_destination": {
            "id_persistent": c.id_instance_destination1,
            "value": c.value_destination1,
        },
    }
    assert_versioned(
        json["conflicts"],
        [
            {
                "replacement_state": "REPLACE",
                "replacement_value": None,
                "column": {
                    "name_path": [cc.name_column_curated_test],
                    "id_parent_persistent": None,
                    "id_persistent": cc.id_column_curated_test,
                    "curated": True,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_origin_curated,
                    "value": c.value_origin_curated,
                },
                "value_destination": {
                    "value": c.value_destination_curated,
                    "id_persistent": c.id_instance_destination_curated,
                },
            },
            unresolvable,
        ],
    )
    assert json["unresolvable_conflicts"] == []
    assert json["updated"] == []
