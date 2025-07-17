# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-statements,duplicate-code
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.entity.common as ce
from tests.merge_request import common as c
from tests.merge_request.api.integration import requests as req
from tests.user import common as cu
from tests.utils import assert_versioned, format_datetime_response
from cosmae.column.models_django import ColumnHistory
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ColumnConflictResolution
from cosmae.value.models_django import ValueHistory


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.merge_request.api.check_user", mock):
        rsp = req.get_conflicts(
            server.url, c.id_persistent_merge_request, cookies=cookies
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.get_conflicts(server.url, c.id_persistent_merge_request)
    assert rsp.status_code == 401


def test_no_mr(auth_server):
    server, cookies = auth_server
    rsp = req.get_conflicts(
        server.url, "4e679630-241e-40f8-b175-c4b7916be379", cookies=cookies
    )
    assert rsp.status_code == 404


def test_conflicts_no_resolution(
    auth_server,
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    server, cookies = auth_server
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 3
    assert_versioned(
        json["merge_request"],
        {
            "assigned_to": {
                "username": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "CONTRIBUTOR",
            },
            "created_by": {
                "username": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "CONTRIBUTOR",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime_response(c.time_merge_request),
            "state": "OPEN",
            "disable_origin_on_merge": False,
            "origin": {
                "id_persistent": c.id_persistent_column_origin,
                "id_parent_persistent": None,
                "name": c.name_column_origin,
                "name_path": [c.name_column_origin],
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
        },
    )

    assert_versioned(
        json["conflicts"],
        [
            {
                "replacement_state": None,
                "replacement_value": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
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
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
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


def test_conflicts_same_value(
    auth_server,
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
):
    for instance_origin in instances_merge_request_origin_user:
        instance_destination = ValueHistory(
            id_entity_persistent=instance_origin.id_entity_persistent,
            id_column_persistent=destination_column_for_mr.id_persistent,
            id_persistent=str(uuid4()),
            value=instance_origin.value,
            time_edit=datetime(1994, 12, 2, tzinfo=timezone.utc),
        )
        instance_destination.save()
    server, cookies = auth_server
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 3
    assert_versioned(
        json["merge_request"],
        {
            "assigned_to": {
                "username": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "CONTRIBUTOR",
            },
            "created_by": {
                "username": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "CONTRIBUTOR",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime_response(c.time_merge_request),
            "state": "OPEN",
            "disable_origin_on_merge": False,
            "origin": {
                "id_persistent": c.id_persistent_column_origin,
                "id_parent_persistent": None,
                "name": c.name_column_origin,
                "name_path": [c.name_column_origin],
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
        },
    )

    conflicts = json["conflicts"]
    assert len(conflicts) == 0
    updated = json["updated"]
    assert len(updated) == 0


def test_conflict_resolved(
    auth_server, merge_request_user, conflict_resolution_replace
):
    server, cookies = auth_server
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 3
    assert_versioned(
        json["merge_request"],
        {
            "assigned_to": {
                "username": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "CONTRIBUTOR",
            },
            "created_by": {
                "username": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "CONTRIBUTOR",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime_response(c.time_merge_request),
            "state": "OPEN",
            "disable_origin_on_merge": False,
            "origin": {
                "id_persistent": c.id_persistent_column_origin,
                "id_parent_persistent": None,
                "name": c.name_column_origin,
                "name_path": [c.name_column_origin],
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
        },
    )
    assert_versioned(
        json["conflicts"],
        [
            {
                "replacement_state": None,
                "replacement_value": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "value_destination": None,
            },
            {
                "replacement_state": "REPLACE",
                "replacement_value": None,
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
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


def test_conflict_resolved_column_origin_changed(
    auth_server, merge_request_user, conflict_resolution_replace
):
    old_column = conflict_resolution_replace.column_origin
    ColumnHistory.change_or_create_versioned(
        id_persistent=old_column.id_persistent,
        version=old_column.id,
        name="changed column test",
        time_edit=datetime(1912, 4, 8, tzinfo=timezone.utc),
        written_by_session=merge_request_user.created_by.edit_session,
        owner_id=merge_request_user.created_by.id,
    )[0].save()
    server, cookies = auth_server
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 3
    assert_versioned(
        json["merge_request"],
        {
            "assigned_to": {
                "username": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "CONTRIBUTOR",
            },
            "created_by": {
                "username": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "CONTRIBUTOR",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime_response(c.time_merge_request),
            "state": "OPEN",
            "disable_origin_on_merge": False,
            "origin": {
                "id_persistent": c.id_persistent_column_origin,
                "id_parent_persistent": None,
                "name": "changed column test",
                "name_path": ["changed column test"],
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
        },
    )

    assert_versioned(
        json["conflicts"],
        [
            {
                "replacement_state": None,
                "replacement_value": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
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
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
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
    assert_versioned(
        json["updated"],
        [
            {
                "replacement_state": None,
                "replacement_value": None,
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_origin1,
                    "value": c.value_origin1,
                },
                "value_destination": {
                    "id_persistent": c.id_instance_destination,
                    "value": c.value_destination,
                },
            }
        ],
    )


def test_value_destination_value_added(
    auth_server,
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
):
    ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        column_origin=origin_column_for_mr,
        column_destination=destination_column_for_mr,
        entity=entity1,
        value_origin=instances_merge_request_origin_user[1],
        merge_request=merge_request_user,
        replacement_state=ColumnConflictResolution.REPLACE,
    )
    id_value_destination = str(uuid4())
    time_edit = datetime(1873, 2, 4, tzinfo=timezone.utc)
    ValueHistory.objects.create(  # pylint: disable=no-member
        id_column_persistent=destination_column_for_mr.id_persistent,
        id_entity_persistent=entity1.id_persistent,
        id_persistent=id_value_destination,
        value="new value destination test",
        time_edit=time_edit,
        written_by_session=destination_column_for_mr.owner.edit_session,
    )

    server, cookies = auth_server
    rsp = req.get_conflicts(
        server.url, merge_request_user.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 3
    assert_versioned(
        json["merge_request"],
        {
            "assigned_to": {
                "username": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "CONTRIBUTOR",
            },
            "created_by": {
                "username": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "CONTRIBUTOR",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime_response(c.time_merge_request),
            "state": "OPEN",
            "disable_origin_on_merge": False,
            "origin": {
                "id_persistent": c.id_persistent_column_origin,
                "id_parent_persistent": None,
                "name": c.name_column_origin,
                "name_path": [c.name_column_origin],
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
        },
    )

    conflict1 = {
        "replacement_state": None,
        "replacement_value": None,
        "entity": {
            "display_txt": ce.display_txt_test1,
            "display_txt_details": "Display Text",
            "id_persistent": ce.id_persistent_test_1,
            "disabled": False,
        },
        "value_origin": {
            "id_persistent": c.id_instance_origin1,
            "value": c.value_origin1,
        },
        "value_destination": {
            "id_persistent": id_value_destination,
            "value": "new value destination test",
        },
    }

    assert_versioned(
        json["conflicts"],
        [
            {
                "replacement_state": None,
                "replacement_value": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "display_txt_details": "Display Text",
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
                },
                "value_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "value_destination": None,
            },
            conflict1,
        ],
    )
    assert_versioned(json["updated"], [conflict1])
