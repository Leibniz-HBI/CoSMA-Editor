# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-statements,duplicate-code
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

from requests import get

import tests.entity.common as ce
import tests.merge_request.api.requests as req
from cosmae.column.models_django import ColumnHistory
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ColumnConflictResolution
from cosmae.value.models_django import ValueHistory
from tests.merge_request import common as c
from tests.utils import assert_versioned


def test_unknown_user(request_commissioner):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.merge_request.api.check_user", mock):
        status, _rsp = req.get_conflicts(
            request_commissioner, c.id_persistent_merge_request
        )
        assert status == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = get(
        server.url
        + f"/cosmae/api/merge_requests/{c.id_persistent_merge_request}/conflicts",
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_no_mr(request_commissioner):
    status, _rsp = req.get_conflicts(
        request_commissioner, "4e679630-241e-40f8-b175-c4b7916be379"
    )
    assert status == 404


def test_conflicts_no_resolution(
    request_user,
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    status, rsp = req.get_conflicts(request_user, merge_request_user.id_persistent)
    assert status == 200
    json = rsp.dict()
    assert len(json) == 3
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
    assert json["id_value_origin_persistent_updated_list"] == []
    assert json["next_offset"] == 1 + max(
        (instance.id for instance in instances_merge_request_origin_user)
    )


def test_conflicts_no_resolution_chunk(
    request_user,
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    status, rsp = req.get_conflicts(
        request_user, merge_request_user.id_persistent, limit=1
    )
    assert status == 200
    json = rsp.dict()
    assert len(json) == 3
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
            }
        ],
    )

    assert json["id_value_origin_persistent_updated_list"] == []
    next_offset = json["next_offset"]
    assert next_offset == 1 + min(
        (instance.id for instance in instances_merge_request_origin_user)
    )
    status, rsp = req.get_conflicts(
        request_user, merge_request_user.id_persistent, limit=1, offset=next_offset
    )
    assert status == 200
    json = rsp.dict()
    assert_versioned(
        json["conflicts"],
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
            },
        ],
    )
    assert json["id_value_origin_persistent_updated_list"] == []
    assert json["next_offset"] == 1 + max(
        (instance.id for instance in instances_merge_request_origin_user)
    )


def test_conflicts_same_value(
    request_user,
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
    status, rsp = req.get_conflicts(request_user, merge_request_user.id_persistent)
    assert status == 200
    json = rsp.dict()
    assert len(json) == 3
    conflicts = json["conflicts"]
    assert len(conflicts) == 0
    updated = json["id_value_origin_persistent_updated_list"]
    assert len(updated) == 0
    assert json["next_offset"] == -1


def test_conflict_resolved(
    request_user, merge_request_user, conflict_resolution_replace
):
    status, rsp = req.get_conflicts(request_user, merge_request_user.id_persistent)
    assert status == 200
    json = rsp.dict()
    assert len(json) == 3
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
    assert json["id_value_origin_persistent_updated_list"] == []
    assert json["next_offset"] == 1 + max(
        (
            instance.id
            for instance in conflict_resolution_replace.merge_request.instance_conflicts_all()
        )
    )


def test_conflict_resolved_column_origin_changed(
    request_user, merge_request_user, conflict_resolution_replace
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
    rsp = req.get_conflicts(request_user, merge_request_user.id_persistent)
    assert rsp[0] == 200
    json = rsp[1].dict()
    assert len(json) == 3
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
    assert json["id_value_origin_persistent_updated_list"] == [c.id_instance_origin1]


def test_value_destination_value_added(
    request_user,
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

    status, rsp = req.get_conflicts(request_user, merge_request_user.id_persistent)
    assert status == 200
    json = rsp.dict()
    assert len(json) == 3

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
    assert json["id_value_origin_persistent_updated_list"] == [c.id_instance_origin1]
