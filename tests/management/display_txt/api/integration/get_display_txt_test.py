# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,duplicate-code
from unittest.mock import MagicMock, patch

import tests.management.display_txt.api.integration.requests as req
import tests.tag.common as ct
import tests.user.common as cu
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.get_tag_definition(server.url)
    assert rsp.status_code == 401


def test_not_authenticated(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.management.display_txt.api.check_user", mock):
        rsp = req.get_tag_definition(server.url, cookies=cookies)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server):
    server, cookies = auth_server
    rsp = req.get_tag_definition(server.url, cookies=cookies)
    assert rsp.status_code == 403


def test_empty(auth_server_commissioner):
    server, cookies = auth_server_commissioner
    rsp = req.get_tag_definition(server.url, cookies=cookies)
    assert rsp.status_code == 200
    assert rsp.json() == {"tag_definitions": []}


def test_three_element_order(auth_server_commissioner, display_txt_order_0_1_curated):
    server, cookies = auth_server_commissioner
    rsp = req.get_tag_definition(server.url, cookies=cookies)
    assert rsp.status_code == 200
    assert_versioned(
        rsp.json(),
        {
            "tag_definitions": [
                {
                    "id_persistent": ct.id_tag_def_persistent_test,
                    "id_parent_persistent": None,
                    "name": ct.name_tag_def_test,
                    "name_path": [ct.name_tag_def_test],
                    "type": "STRING",
                    "curated": False,
                    "hidden": False,
                    "disabled": False,
                    "description": None,
                    "owner": {
                        "username": "test-user",
                        "id_persistent": cu.test_uuid,
                        "permission_group": "APPLICANT",
                    },
                },
                {
                    "id_persistent": ct.id_tag_def_persistent_test_user1,
                    "id_parent_persistent": None,
                    "name": ct.name_tag_def_test1,
                    "name_path": [ct.name_tag_def_test1],
                    "type": "STRING",
                    "curated": False,
                    "hidden": False,
                    "disabled": False,
                    "description": None,
                    "owner": {
                        "username": "test-user1",
                        "id_persistent": cu.test_uuid1,
                        "permission_group": "APPLICANT",
                    },
                },
                {
                    "id_persistent": ct.id_tag_def_curated_test,
                    "id_parent_persistent": None,
                    "name": ct.name_tag_def_curated_test,
                    "name_path": [ct.name_tag_def_curated_test],
                    "type": "STRING",
                    "description": None,
                    "curated": True,
                    "hidden": False,
                    "disabled": False,
                    "owner": None,
                },
            ]
        },
    )
