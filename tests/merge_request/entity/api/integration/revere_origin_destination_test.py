# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

from tests.merge_request.entity import common as c
from tests.merge_request.entity.api.integration import requests as req
from tests.tag import common as ct
from tests.user import common as cu
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException


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
    conflict_resolution_replace,
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
    assert len(json) == 4
    assert_versioned(
        json["merge_request"],
        {
            "created_by": {
                "user_name": cu.test_username_commissioner,
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
        json["resolvable_conflicts"],
        [],
    )
    assert_versioned(
        json["unresolvable_conflicts"],
        [
            {
                "replace": False,
                "tag_definition": {
                    "name_path": [ct.name_tag_def_test1],
                    "id_parent_persistent": None,
                    "id_persistent": ct.id_tag_def_persistent_test_user1,
                    "curated": False,
                    "hidden": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_destination,
                    "value": c.value_destination,
                },
                "tag_instance_destination": {
                    "id_persistent": c.id_instance_origin1,
                    "value": c.value_origin1,
                },
            },
        ],
    )
    assert json["updated"] == []


def test_double_reverse(
    auth_server_commissioner,
    instance_merge_request_destination_user_conflict,
    merge_request_user,
    conflict_resolution_replace,
    resolution_curated_destination_none,
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
    assert len(json) == 4
    assert_versioned(
        json["merge_request"],
        {
            "created_by": {
                "user_name": cu.test_username_commissioner,
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

    assert_versioned(
        json["resolvable_conflicts"],
        [
            {
                "replace": True,
                "tag_definition": {
                    "name_path": [ct.name_tag_def_curated_test],
                    "id_parent_persistent": None,
                    "id_persistent": ct.id_tag_def_curated_test,
                    "curated": True,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin_curated,
                    "value": c.value_origin_curated,
                },
                "tag_instance_destination": None,
            },
        ],
    )
    assert_versioned(
        json["unresolvable_conflicts"],
        [
            {
                "replace": None,
                "tag_definition": {
                    "name_path": [ct.name_tag_def_test],
                    "id_parent_persistent": None,
                    "id_persistent": ct.id_tag_def_persistent_test,
                    "curated": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "tag_instance_destination": None,
            },
            {
                "replace": True,
                "tag_definition": {
                    "name_path": [ct.name_tag_def_test1],
                    "id_parent_persistent": None,
                    "id_persistent": ct.id_tag_def_persistent_test_user1,
                    "curated": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin1,
                    "value": c.value_origin1,
                },
                "tag_instance_destination": {
                    "id_persistent": c.id_instance_destination,
                    "value": c.value_destination,
                },
            },
        ],
    )
    assert json["updated"] == []
