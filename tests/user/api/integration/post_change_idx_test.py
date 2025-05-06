# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.api.integration.requests as req
import tests.user.common as c
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.user.api.check_user", mock):
        rsp = req.post_change_columns(server.url, 0, 1, cookies=cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.post_change_columns(server.url, 0, 1)
    assert rsp.status_code == 401


def test_empty_list(auth_server):
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 2, 4, cookies=cookies)
    assert rsp.status_code == 400  # pylint: disable=duplicate-code


def test_out_of_bounds(auth_server, tag_def_user_profile, tag_def_user_profile1):
    server, cookies = auth_server
    rsp = req.post_append_id_column_persistent(
        server.url, tag_def_user_profile.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req.post_append_id_column_persistent(
        server.url, tag_def_user_profile1.id_persistent, cookies=cookies
    )
    rsp = req.post_change_columns(server.url, 2, 4, cookies=cookies)
    assert rsp.status_code == 400


def test_start_to_middle(auth_server, user_with_tag_defs):
    # pylint: disable=duplicate-code
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 0, 2, cookies=cookies)
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [tag_def["id_persistent"] for tag_def in json["data"]["column_list"]] == [
        c.id_tag_def_persistent2,
        c.id_tag_def_persistent1,
        c.id_tag_def_persistent,
        c.id_tag_def_persistent3,
    ]


def test_start_to_end(auth_server, user_with_tag_defs):
    # pylint: disable=duplicate-code
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 0, 3, cookies=cookies)
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [tag_def["id_persistent"] for tag_def in json["data"]["column_list"]] == [
        c.id_tag_def_persistent3,
        c.id_tag_def_persistent1,
        c.id_tag_def_persistent2,
        c.id_tag_def_persistent,
    ]


def test_middle_to_start(auth_server, user_with_tag_defs):
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 2, 0, cookies=cookies)
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [tag_def["id_persistent"] for tag_def in json["data"]["column_list"]] == [
        c.id_tag_def_persistent2,
        c.id_tag_def_persistent1,
        c.id_tag_def_persistent,
        c.id_tag_def_persistent3,
    ]


def test_middle_to_middle(auth_server, user_with_tag_defs):
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 2, 1, cookies=cookies)
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [tag_def["id_persistent"] for tag_def in json["data"]["column_list"]] == [
        c.id_tag_def_persistent,
        c.id_tag_def_persistent2,
        c.id_tag_def_persistent1,
        c.id_tag_def_persistent3,
    ]


def test_middle_to_end(auth_server, user_with_tag_defs):
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 2, 3, cookies=cookies)
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [tag_def["id_persistent"] for tag_def in json["data"]["column_list"]] == [
        c.id_tag_def_persistent,
        c.id_tag_def_persistent1,
        c.id_tag_def_persistent3,
        c.id_tag_def_persistent2,
    ]


def test_ent_to_start(auth_server, user_with_tag_defs):
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 3, 0, cookies=cookies)
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [tag_def["id_persistent"] for tag_def in json["data"]["column_list"]] == [
        c.id_tag_def_persistent3,
        c.id_tag_def_persistent1,
        c.id_tag_def_persistent2,
        c.id_tag_def_persistent,
    ]


def test_end_to_middle(auth_server, user_with_tag_defs):
    server, cookies = auth_server
    rsp = req.post_change_columns(server.url, 3, 1, cookies=cookies)
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [tag_def["id_persistent"] for tag_def in json["data"]["column_list"]] == [
        c.id_tag_def_persistent,
        c.id_tag_def_persistent3,
        c.id_tag_def_persistent2,
        c.id_tag_def_persistent1,
    ]
