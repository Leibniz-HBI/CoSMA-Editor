# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-statements,duplicate-code
from unittest.mock import MagicMock, patch

from requests import get

from cosmae.exception import NotAuthenticatedException
from tests.merge_request.entity import common as c
from tests.merge_request.entity.api import requests as req
from tests.user import common as cu
from tests.utils import assert_versioned


def test_unknown_user(request_user):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.merge_request.entity.api.check_user", mock):
        status, _rsp = req.get_conflicts(request_user, c.id_merge_request_persistent)
        assert status == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = get(
        server.url
        + f"/cosmae/api/merge_requests/entities/{c.id_merge_request_persistent}"
        + "/conflicts?offset=0&limit=10",
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_no_mr(request_user):
    status, _rsp = req.get_conflicts(
        request_user, "4e679630-241e-40f8-b175-c4b7916be379"
    )
    assert status == 404


def test_conflicts_no_resolution(
    request_commissioner,
    merge_request_user,
    column,
    origin_entity_for_mr,
    destination_entity_for_mr,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict1,
):
    status, rsp = req.get_conflicts(
        request_commissioner, merge_request_user.id_persistent
    )
    assert status == 200
    json = rsp.dict()
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

    assert_versioned(
        json["conflicts"],
        [],
    )
    assert_versioned(json["unresolvable_conflicts"], [])
    assert json["updated"] == []
    assert json["next_offset"] == -1


def test_slices(
    request_commissioner,
    merge_request_user,
    column,
    conflict_resolution_keep1,
    conflict_resolution_replace0,
):
    "Make sure that the API will slice."
    status, rsp = req.get_conflicts(
        request_commissioner, merge_request_user.id_persistent, limit=1
    )
    assert status == 200
    assert len(rsp.conflicts) == 1
    conflict0 = rsp.conflicts[0]
    next_offset = rsp.next_offset
    status, rsp = req.get_conflicts(
        request_commissioner,
        merge_request_user.id_persistent,
        offset=next_offset,
        limit=1,
    )
    assert status == 200
    assert len(rsp.conflicts) == 1
    conflict1 = rsp.conflicts[0]
    next_offset = rsp.next_offset
    status, rsp = req.get_conflicts(
        request_commissioner,
        merge_request_user.id_persistent,
        offset=next_offset,
    )
    assert status == 200
    assert len(rsp.conflicts) == 0
    assert rsp.next_offset == -1
    assert {
        conflict0.value_origin.id_persistent,
        conflict1.value_origin.id_persistent,
    } == {
        c.id_instance_origin_curated,
        c.id_instance_origin1,
    }


def test_reports_unresolvable_conflicts(
    request_commissioner,
    merge_request_user,
    conflict_resolution_user,
):
    "Make sure that the API will report unresolvable conflicts."
    status, rsp = req.get_conflicts(
        request_commissioner, merge_request_user.id_persistent
    )
    assert status == 200
    assert len(rsp.conflicts) == 1
    assert len(rsp.unresolvable_conflicts) == 1
    assert (
        rsp.unresolvable_conflicts[0].value_destination.id_persistent
        == rsp.conflicts[0].value_destination.id_persistent
    )


def test_reports_updated_conflicts(
    request_commissioner,
    merge_request_user,
    conflict_resolution_keep1,
    instance_merge_request_destination_user_conflict_changed1,
):
    "Make sure that the API will report unresolvable conflicts."
    status, rsp = req.get_conflicts(
        request_commissioner, merge_request_user.id_persistent
    )
    assert status == 200
    assert len(rsp.conflicts) == 1
    assert len(rsp.updated) == 1
    assert (
        rsp.updated[0].value_destination.id_persistent
        == rsp.conflicts[0].value_destination.id_persistent
    )
