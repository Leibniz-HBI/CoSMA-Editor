# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
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
    assert rsp.json() == {
        "created": [
            {
                "id_persistent": c.id_persistent_merge_request1,
                "created_by": {
                    "user_name": cu.test_username,
                    "id_persistent": cu.test_uuid,
                },
                "assigned_to": {
                    "user_name": cu.test_username1,
                    "id_persistent": cu.test_uuid1,
                },
                "destination": {
                    "id_persistent": c.id_persistent_tag_def_destination1,
                    "id_parent_persistent": None,
                    "name": c.name_tag_def_destination1,
                    "version": 3,
                    "type": "STRING",
                    "owner": "test-user1",
                },
                "origin": {
                    "name": c.name_tag_def_origin1,
                    "id_parent_persistent": None,
                    "id_persistent": c.id_persistent_tag_def_origin1,
                    "version": 4,
                    "type": "STRING",
                    "owner": "test-user",
                },
                "created_at": format_datetime(c.time_merge_request1),
            }
        ],
        "assigned": [
            {
                "id_persistent": c.id_persistent_merge_request,
                "created_by": {
                    "user_name": cu.test_username1,
                    "id_persistent": cu.test_uuid1,
                },
                "assigned_to": {
                    "user_name": cu.test_username,
                    "id_persistent": cu.test_uuid,
                },
                "destination": {
                    "id_persistent": c.id_persistent_tag_def_destination,
                    "id_parent_persistent": None,
                    "name": c.name_tag_def_destination,
                    "version": 2,
                    "type": "FLOAT",
                    "owner": "test-user",
                },
                "origin": {
                    "name": c.name_tag_def_origin,
                    "id_persistent": c.id_persistent_tag_def_origin,
                    "id_parent_persistent": None,
                    "version": 1,
                    "type": "FLOAT",
                    "owner": "test-user1",
                },
                "created_at": format_datetime(c.time_merge_request),
            }
        ],
    }
