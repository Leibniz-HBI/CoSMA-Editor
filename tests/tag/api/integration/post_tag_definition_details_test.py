# pylint: disable=missing-module-docstring, redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, patch

import tests.tag.api.integration.requests as r
import tests.user.common as cu
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException


def test_no_cookies(auth_server):
    "Check 401 response for missing cookies"
    server, _ = auth_server
    rsp = r.post_details(server.url, [])
    assert rsp.status_code == 401


def test_unauthenticated(auth_server):
    "Check 401 response for user check error"
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.tag.api.definitions.check_user", mock):
        rsp = r.post_details(server.url, [], cookies=cookies)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    "Check insufficient permission response for applicants."
    server, cookies = auth_server_applicant
    rsp = r.post_details(server.url, [], cookies)
    assert rsp.status_code == 403


def test_request_too_large(auth_server):
    "Check bad request for too many requests tag defs"
    server, cookies = auth_server
    id_list = [str(idx) for idx in range(1001)]
    rsp = r.post_details(server.url, id_list, cookies)
    assert rsp.status_code == 400


def test_get_details(auth_server, tag_def, tag_def1, tag_def_user):
    "check correct details response"
    server, cookies = auth_server
    rsp = r.post_details(
        server.url, [tag_def.id_persistent, tag_def_user.id_persistent], cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert_versioned(
        json["tag_definitions"],
        [
            {
                "id_persistent": tag_def_user.id_persistent,
                "id_parent_persistent": tag_def_user.id_parent_persistent,
                "name": tag_def_user.name,
                "name_path": [tag_def_user.name],
                "type": "FLOAT",
                "owner": {
                    "username": cu.test_username,
                    "id_persistent": cu.test_uuid,
                    "permission_group": "CONTRIBUTOR",
                },
                "curated": False,
                "description": None,
                "disabled": False,
                "hidden": False,
            },
            {
                "id_persistent": tag_def.id_persistent,
                "id_parent_persistent": tag_def.id_parent_persistent,
                "name": tag_def.name,
                "name_path": [tag_def.name],
                "type": "FLOAT",
                "owner": {
                    "username": cu.test_username,
                    "id_persistent": cu.test_uuid,
                    "permission_group": "CONTRIBUTOR",
                },
                "curated": False,
                "description": None,
                "disabled": False,
                "hidden": False,
            },
        ],
    )
