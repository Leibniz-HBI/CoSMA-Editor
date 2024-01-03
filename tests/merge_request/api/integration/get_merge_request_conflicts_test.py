# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.entity.common as ce
from tests.merge_request import common as c
from tests.merge_request.api.integration import requests as req
from tests.user import common as cu
from tests.utils import assert_versioned, format_datetime
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import TagConflictResolution
from cosmae.tag.models_django import TagDefinition, TagInstanceHistory


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
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
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
                "user_name": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "APPLICANT",
            },
            "created_by": {
                "user_name": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "APPLICANT",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime(c.time_merge_request),
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_persistent_tag_def_origin,
                "id_parent_persistent": None,
                "name": c.name_tag_def_origin,
                "name_path": [c.name_tag_def_origin],
                "type": "STRING",
                "owner": "test-user1",
                "curated": False,
                "hidden": False,
            },
            "destination": {
                "id_persistent": c.id_persistent_tag_def_destination,
                "id_parent_persistent": None,
                "name": c.name_tag_def_destination,
                "name_path": [c.name_tag_def_destination],
                "type": "STRING",
                "owner": "test-user",
                "curated": False,
                "hidden": False,
            },
        },
    )

    assert_versioned(
        json["conflicts"],
        [
            {
                "replace": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "tag_instance_destination": None,
            },
            {
                "replace": None,
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
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
    auth_server,
    merge_request_user,
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
    entity1,
    instances_merge_request_origin_user,
):
    for instance_origin in instances_merge_request_origin_user:
        instance_destination = TagInstanceHistory(
            id_entity_persistent=instance_origin.id_entity_persistent,
            id_tag_definition_persistent=destination_tag_def_for_mr.id_persistent,
            id_persistent=str(uuid4()),
            value=instance_origin.value,
            time_edit=datetime(1994, 12, 2),
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
                "user_name": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "APPLICANT",
            },
            "created_by": {
                "user_name": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "APPLICANT",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime(c.time_merge_request),
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_persistent_tag_def_origin,
                "id_parent_persistent": None,
                "name": c.name_tag_def_origin,
                "name_path": [c.name_tag_def_origin],
                "type": "STRING",
                "owner": "test-user1",
                "curated": False,
                "hidden": False,
            },
            "destination": {
                "id_persistent": c.id_persistent_tag_def_destination,
                "id_parent_persistent": None,
                "name": c.name_tag_def_destination,
                "name_path": [c.name_tag_def_destination],
                "type": "STRING",
                "owner": "test-user",
                "curated": False,
                "hidden": False,
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
                "user_name": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "APPLICANT",
            },
            "created_by": {
                "user_name": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "APPLICANT",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime(c.time_merge_request),
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_persistent_tag_def_origin,
                "id_parent_persistent": None,
                "name": c.name_tag_def_origin,
                "name_path": [c.name_tag_def_origin],
                "type": "STRING",
                "owner": "test-user1",
                "curated": False,
                "hidden": False,
            },
            "destination": {
                "id_persistent": c.id_persistent_tag_def_destination,
                "id_parent_persistent": None,
                "name": c.name_tag_def_destination,
                "name_path": [c.name_tag_def_destination],
                "type": "STRING",
                "owner": "test-user",
                "curated": False,
                "hidden": False,
            },
        },
    )
    assert_versioned(
        json["conflicts"],
        [
            {
                "replace": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "tag_instance_destination": None,
            },
            {
                "replace": True,
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
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


def test_conflict_resolved_tag_def_origin_changed(
    auth_server, merge_request_user, conflict_resolution_replace
):
    old_tag_definition = conflict_resolution_replace.tag_definition_origin
    TagDefinition.change_or_create(
        id_persistent=old_tag_definition.id_persistent,
        version=old_tag_definition.id,
        name="changed tag definition test",
        time_edit=datetime(1912, 4, 8),
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
                "user_name": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "APPLICANT",
            },
            "created_by": {
                "user_name": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "APPLICANT",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime(c.time_merge_request),
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_persistent_tag_def_origin,
                "id_parent_persistent": None,
                "name": "changed tag definition test",
                "name_path": ["changed tag definition test"],
                "type": "STRING",
                "owner": "test-user1",
                "curated": False,
                "hidden": False,
            },
            "destination": {
                "id_persistent": c.id_persistent_tag_def_destination,
                "id_parent_persistent": None,
                "name": c.name_tag_def_destination,
                "name_path": [c.name_tag_def_destination],
                "type": "STRING",
                "owner": "test-user",
                "curated": False,
                "hidden": False,
            },
        },
    )

    assert_versioned(
        json["conflicts"],
        [
            {
                "replace": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "tag_instance_destination": None,
            },
            {
                "replace": None,
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
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
    assert_versioned(
        json["updated"],
        [
            {
                "replace": None,
                "entity": {
                    "display_txt": ce.display_txt_test1,
                    "id_persistent": ce.id_persistent_test_1,
                    "disabled": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin1,
                    "value": c.value_origin1,
                },
                "tag_instance_destination": {
                    "id_persistent": c.id_instance_destination,
                    "value": c.value_destination,
                },
            }
        ],
    )


def test_tag_instance_destination_value_added(
    auth_server,
    merge_request_user,
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
    entity1,
    instances_merge_request_origin_user,
):
    TagConflictResolution.objects.create(  # pylint: disable=no-member
        tag_definition_origin=origin_tag_def_for_mr,
        tag_definition_destination=destination_tag_def_for_mr,
        entity=entity1,
        tag_instance_origin=instances_merge_request_origin_user[1],
        merge_request=merge_request_user,
        replace=True,
    )
    id_tag_instance_destination = str(uuid4())
    time_edit = datetime(1873, 2, 4)
    TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_tag_definition_persistent=destination_tag_def_for_mr.id_persistent,
        id_entity_persistent=entity1.id_persistent,
        id_persistent=id_tag_instance_destination,
        value="new value destination test",
        time_edit=time_edit,
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
                "user_name": cu.test_username,
                "id_persistent": cu.test_uuid,
                "permission_group": "APPLICANT",
            },
            "created_by": {
                "user_name": cu.test_username1,
                "id_persistent": cu.test_uuid1,
                "permission_group": "APPLICANT",
            },
            "id_persistent": c.id_persistent_merge_request,
            "created_at": format_datetime(c.time_merge_request),
            "state": "OPEN",
            "origin": {
                "id_persistent": c.id_persistent_tag_def_origin,
                "id_parent_persistent": None,
                "name": c.name_tag_def_origin,
                "name_path": [c.name_tag_def_origin],
                "type": "STRING",
                "owner": "test-user1",
                "curated": False,
                "hidden": False,
            },
            "destination": {
                "id_persistent": c.id_persistent_tag_def_destination,
                "id_parent_persistent": None,
                "name": c.name_tag_def_destination,
                "name_path": [c.name_tag_def_destination],
                "type": "STRING",
                "owner": "test-user",
                "curated": False,
                "hidden": False,
            },
        },
    )

    conflict1 = {
        "replace": None,
        "entity": {
            "display_txt": ce.display_txt_test1,
            "id_persistent": ce.id_persistent_test_1,
            "disabled": False,
        },
        "tag_instance_origin": {
            "id_persistent": c.id_instance_origin1,
            "value": c.value_origin1,
        },
        "tag_instance_destination": {
            "id_persistent": id_tag_instance_destination,
            "value": "new value destination test",
        },
    }

    assert_versioned(
        json["conflicts"],
        [
            {
                "replace": None,
                "entity": {
                    "display_txt": ce.display_txt_test0,
                    "id_persistent": ce.id_persistent_test_0,
                    "disabled": False,
                },
                "tag_instance_origin": {
                    "id_persistent": c.id_instance_origin,
                    "value": c.value_origin,
                },
                "tag_instance_destination": None,
            },
            conflict1,
        ],
    )
    assert_versioned(json["updated"], [conflict1])
