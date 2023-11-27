# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from tests.merge_request.entity import common as c
from tests.merge_request.entity.api.integration import requests as req
from tests.tag import common as ct
from tests.user import common as cu
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException
from cosmae.tag.models_django import TagInstance


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.merge_request.entity.api.check_user", mock):
        rsp = req.get_conflicts(
            server.url, c.id_merge_request_persistent, cookies=cookies
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.get_conflicts(server.url, c.id_merge_request_persistent)
    assert rsp.status_code == 401


def test_no_mr(auth_server):
    server, cookies = auth_server
    rsp = req.get_conflicts(
        server.url, "4e679630-241e-40f8-b175-c4b7916be379", cookies=cookies
    )
    assert rsp.status_code == 404


def test_conflicts_no_resolution(
    auth_server_commissioner,
    merge_request_user,
    tag_def,
    origin_entity_for_mr,
    destination_entity_for_mr,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    server, cookies = auth_server_commissioner
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
            },
            "destination": {
                "id_persistent": c.id_entity_destination_persistent,
                "display_txt": c.display_txt_entity_destination,
            },
        },
    )

    assert_versioned(
        json["resolvable_conflicts"],
        [
            {
                "replace": None,
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
                    "id_persistent": ct.id_tag_def_persistent_test_user,
                    "curated": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "tag_instance_destination": None,
            },
            {
                "replace": None,
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


def test_conflicts_same_value(
    auth_server_commissioner,
    merge_request_user,
    tag_def,
    origin_entity_for_mr,
    destination_entity_for_mr,
    instances_merge_request_origin_user,
):
    for instance_origin in instances_merge_request_origin_user:
        instance_destination = TagInstance(
            id_entity_persistent=merge_request_user.id_destination_persistent,
            id_tag_definition_persistent=instance_origin.id_tag_definition_persistent,
            id_persistent=str(uuid4()),
            value=instance_origin.value,
            time_edit=datetime(1994, 12, 2),
        )
        instance_destination.save()
    server, cookies = auth_server_commissioner
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
            },
            "destination": {
                "id_persistent": c.id_entity_destination_persistent,
                "display_txt": c.display_txt_entity_destination,
            },
        },
    )

    assert json["resolvable_conflicts"] == []

    assert json["unresolvable_conflicts"] == []
    assert json["updated"] == []


def test_conflicts_resolved(
    auth_server_commissioner, merge_request_user, conflict_resolution_replace
):
    server, cookies = auth_server_commissioner
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
            },
            "destination": {
                "id_persistent": c.id_entity_destination_persistent,
                "display_txt": c.display_txt_entity_destination,
            },
        },
    )

    assert_versioned(
        json["resolvable_conflicts"],
        [
            {
                "replace": None,
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
                    "id_persistent": ct.id_tag_def_persistent_test_user,
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
