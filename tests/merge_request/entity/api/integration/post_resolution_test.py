# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-statements,duplicate-code
from unittest.mock import MagicMock, patch

from tests.merge_request.entity import common as c
from tests.merge_request.entity.api.integration import requests as req
from tests.tag import common as ct
from tests.user import common as cu
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server_commissioner, merge_request_user):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server_commissioner
    with patch("cosmae.merge_request.entity.api.check_user", mock):
        rsp = req.post_resolution(
            server.url,
            c.id_merge_request_persistent,
            "",
            0,
            "",
            0,
            "",
            0,
            "",
            0,
            "",
            0,
            "KEEP",
            cookies=cookies,
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server_commissioner):
    server, _ = auth_server_commissioner
    rsp = req.post_resolution(
        server.url,
        c.id_merge_request_persistent,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "KEEP",
    )
    assert rsp.status_code == 401


def test_normal_user(auth_server):
    server, cookies = auth_server
    rsp = req.post_resolution(
        server.url,
        c.id_merge_request_persistent,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "KEEP",
        cookies=cookies,
    )
    assert rsp.status_code == 403


def test_no_mr(auth_server_commissioner):
    server, cookies = auth_server_commissioner
    rsp = req.post_resolution(
        server.url,
        c.id_merge_request_persistent,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "KEEP",
        cookies=cookies,
    )
    assert rsp.status_code == 404


def test_resolve_conflicts(
    auth_server_commissioner,
    column_curated,
    origin_entity_for_mr,
    destination_entity_for_mr,
    merge_request_user,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    server, cookies = auth_server_commissioner
    rsp = req.post_resolution(
        server.url,
        c.id_merge_request_persistent,
        id_column_persistent=column_curated.id_persistent,
        id_column_version=column_curated.id,
        id_entity_origin_persistent=origin_entity_for_mr.id_persistent,
        id_entity_origin_version=origin_entity_for_mr.id,
        id_entity_destination_persistent=destination_entity_for_mr.id_persistent,
        id_entity_destination_version=destination_entity_for_mr.id,
        id_value_origin_persistent=instances_merge_request_origin_user[2].id_persistent,
        id_value_origin_version=instances_merge_request_origin_user[2].id,
        id_value_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_value_destination_version=instance_merge_request_destination_user_conflict.id,
        replacement_state="REPLACE",
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_conflicts(server.url, c.id_merge_request_persistent, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 4
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

    assert_versioned(
        json["resolvable_conflicts"],
        [
            {
                "replacement_state": "REPLACE",
                "replacement_value": None,
                "column": {
                    "name_path": [ct.name_column_curated_test],
                    "id_parent_persistent": None,
                    "id_persistent": ct.id_column_curated_test,
                    "curated": True,
                    "hidden": False,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_origin_curated,
                    "value": c.value_origin_curated,
                },
                "value_destination": None,
            },
        ],
    )
    assert_versioned(
        json["unresolvable_conflicts"],
        [
            {
                "replacement_state": None,
                "replacement_value": None,
                "column": {
                    "name_path": [ct.name_column_test],
                    "id_parent_persistent": None,
                    "id_persistent": ct.id_column_persistent_test,
                    "curated": False,
                    "hidden": False,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "value_destination": None,
            },
            {
                "replacement_state": None,
                "replacement_value": None,
                "column": {
                    "name_path": [ct.name_column_test1],
                    "id_parent_persistent": None,
                    "id_persistent": ct.id_column_persistent_test_user1,
                    "curated": False,
                    "hidden": False,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_origin1,
                    "value": c.value_origin1,
                },
                "value_destination": {
                    "id_persistent": c.id_instance_destination,
                    "value": c.value_destination,
                },
            },
        ],
    )
    assert json["updated"] == []


def test_can_not_write_column(
    auth_server_commissioner,
    column,
    merge_request_user,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    server, cookies = auth_server_commissioner
    rsp = req.post_resolution(
        server.url,
        c.id_merge_request_persistent,
        id_column_persistent=column.id_persistent,
        id_column_version=column.id,
        id_entity_origin_persistent=merge_request_user.id_origin_persistent,
        id_entity_origin_version=1,
        id_entity_destination_persistent=merge_request_user.id_destination_persistent,
        id_entity_destination_version=2,
        id_value_origin_persistent=instances_merge_request_origin_user[0].id_persistent,
        id_value_origin_version=instances_merge_request_origin_user[0].id,
        id_value_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_value_destination_version=instance_merge_request_destination_user_conflict.id,
        replacement_state="REPLACE",
        cookies=cookies,
    )
    assert rsp.status_code == 403
