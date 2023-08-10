# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.common as cu
from tests.merge_request import common as c
from tests.merge_request.api.integration import requests as req
from tests.utils import format_datetime
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
    }
    assert created["assigned_to"] == {
        "user_name": cu.test_username1,
        "id_persistent": cu.test_uuid1,
    }
    assert created["state"] == "OPEN"
    destination = created["destination"]
    assert len(destination) == 6
    assert destination["id_persistent"] == c.id_persistent_tag_def_destination1
    assert destination["id_parent_persistent"] is None
    assert destination["name"] == c.name_tag_def_destination1
    assert destination["type"] == "STRING"
    assert destination["owner"] == "test-user1"
    assert "version" in destination
    origin = created["origin"]
    assert len(origin) == 6
    assert origin["name"] == c.name_tag_def_origin1
    assert origin["id_parent_persistent"] is None
    assert origin["id_persistent"] == c.id_persistent_tag_def_origin1
    assert origin["type"] == "STRING"
    assert origin["owner"] == "test-user"
    assert "version" in origin

    assigned_list = json["assigned"]
    assert len(assigned_list) == 1
    assigned = assigned_list[0]
    assert len(assigned) == 7
    assert assigned["created_at"] == format_datetime(c.time_merge_request)
    assert assigned["id_persistent"] == c.id_persistent_merge_request
    assert assigned["created_by"] == {
        "user_name": cu.test_username1,
        "id_persistent": cu.test_uuid1,
    }
    assert assigned["assigned_to"] == {
        "user_name": cu.test_username,
        "id_persistent": cu.test_uuid,
    }
    assert assigned["state"] == "OPEN"
    destination = assigned["destination"]
    assert len(destination) == 6
    assert destination["id_persistent"] == c.id_persistent_tag_def_destination
    assert destination["id_parent_persistent"] is None
    assert destination["name"] == c.name_tag_def_destination
    assert destination["type"] == "STRING"
    assert destination["owner"] == "test-user"
    assert "version" in destination
    origin = assigned["origin"]
    assert len(origin) == 6
    assert origin["name"] == c.name_tag_def_origin
    assert origin["id_persistent"] == c.id_persistent_tag_def_origin
    assert origin["id_parent_persistent"] is None
    assert origin["type"] == "STRING"
    assert origin["owner"] == "test-user1"
    assert "version" in origin
