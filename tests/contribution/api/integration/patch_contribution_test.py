# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
import tests.edit_session.common as cs
import tests.user.common as cu
from cosmae.util.auth import NotAuthenticatedException


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = req_contrib.patch_contribution(
        live_server.url, "id-test", {"name": "new name"}
    )
    assert rsp.status_code == 401


def test_invalid_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.api.check_user", mock):
        live_server, cookies = auth_server
        rsp = req_contrib.patch_contribution(
            live_server.url, "id-test", {"name": "name"}, cookies=cookies
        )
        assert rsp.status_code == 401


def test_404(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.patch_contribution(
        live_server.url, str(uuid4()), {"name": "new name"}, cookies=cookies
    )
    assert rsp.status_code == 404


def test_wrong_user(auth_server1):
    live_server, cookies0, cookies1 = auth_server1
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies0
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, {"name": "new name"}, cookies=cookies1
    )
    assert rsp.status_code == 404


def test_patch_name(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, {"name": "new name"}, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == "new name"
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert not contribution["has_header"]
    assert contribution["empty_values"] == cu.test_empty_values
    assert contribution["id_edit_session_persistent"] == cs.id_session_user


def test_patch_description(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url,
        id_persistent,
        {"description": "new description"},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == "new description"
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert not contribution["has_header"]
    assert contribution["empty_values"] == cu.test_empty_values
    assert contribution["id_edit_session_persistent"] == cs.id_session_user


def test_patch_header_flag(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, {"has_header": True}, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["has_header"]
    assert contribution["empty_values"] == cu.test_empty_values
    assert contribution["id_edit_session_persistent"] == cs.id_session_user


def test_patch_empty_values(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url,
        id_persistent,
        {"empty_values": "empty,absent"},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["empty_values"] == "empty,absent"
    assert not contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user


def test_patch_edit_session(auth_server, other_session):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url,
        id_persistent,
        {"id_edit_session_persistent": other_session.id_persistent},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["empty_values"] == "null,nan,na"
    assert not contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user_changed


def test_patch_unknown_edit_session(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url,
        id_persistent,
        {"id_edit_session_persistent": "zzzz"},
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json() == {"msg": "Unknown edit session."}


def test_patch_all(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url,
        id_persistent,
        {
            "name": "new name",
            "description": "new description",
            "has_header": True,
            "empty_values": "empty,absent",
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == "new name"
    assert contribution["description"] == "new description"
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["empty_values"] == "empty,absent"
    assert contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user


def test_unknown_field(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, {"foo": "bar"}, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert not contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user
