# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.common as cu
from tests.merge_request import common as c
from tests.merge_request.api.integration import requests as req
from tests.utils import assert_versioned, format_datetime
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
        },
    )
